import networkx as nx
from typing import Dict, List, Any, Optional

class MicroserviceGraph:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_default_topology()

    def _build_default_topology(self):
        """Builds the 6-service microservice dependency graph."""
        nodes = [
            {
                "id": "api-gateway",
                "name": "API Gateway",
                "type": "gateway",
                "tier": "edge",
                "runtime": "Envoy / Go",
                "port": 8080,
                "x": 400,
                "y": 60,
                "description": "Public ingress router, SSL termination & rate limiting"
            },
            {
                "id": "order-service",
                "name": "Order Service",
                "type": "service",
                "tier": "application",
                "runtime": "Node.js / Express",
                "port": 3001,
                "x": 400,
                "y": 190,
                "description": "Order creation, state machine & checkout orchestration"
            },
            {
                "id": "payment-service",
                "name": "Payment Service",
                "type": "service",
                "tier": "application",
                "runtime": "Java / Spring Boot",
                "port": 3002,
                "x": 230,
                "y": 330,
                "description": "Payment authorization, capture & ledger accounting"
            },
            {
                "id": "inventory-service",
                "name": "Inventory Service",
                "type": "service",
                "tier": "application",
                "runtime": "Python / FastAPI",
                "port": 3003,
                "x": 570,
                "y": 330,
                "description": "SKU catalog, warehouse reservation & stock levels"
            },
            {
                "id": "payment-db",
                "name": "Payment Database",
                "type": "database",
                "tier": "data",
                "runtime": "PostgreSQL 15.3",
                "port": 5432,
                "x": 230,
                "y": 480,
                "description": "ACID transactional database for payments and accounts"
            },
            {
                "id": "stock-db",
                "name": "Stock Database",
                "type": "database",
                "tier": "data",
                "runtime": "PostgreSQL 15.3",
                "port": 5433,
                "x": 570,
                "y": 480,
                "description": "Relational store for warehouse stock counts and reservations"
            }
        ]

        for n in nodes:
            self.graph.add_node(n["id"], **n)

        # Directed edges: source calls target (dependency flows top to bottom)
        edges = [
            ("api-gateway", "order-service", {"protocol": "gRPC / HTTP2", "timeout_ms": 2500}),
            ("order-service", "payment-service", {"protocol": "REST / HTTP", "timeout_ms": 2000}),
            ("order-service", "inventory-service", {"protocol": "REST / HTTP", "timeout_ms": 1500}),
            ("payment-service", "payment-db", {"protocol": "TCP / SQL (Pool)", "timeout_ms": 1000}),
            ("inventory-service", "stock-db", {"protocol": "TCP / SQL (Pool)", "timeout_ms": 1000})
        ]

        for u, v, data in edges:
            self.graph.add_edge(u, v, **data)

    def get_topology(self) -> Dict[str, Any]:
        """Returns nodes and edges serializable to JSON."""
        nodes = []
        for node_id, data in self.graph.nodes(data=True):
            node_dict = dict(data)
            node_dict["id"] = node_id
            nodes.append(node_dict)

        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "protocol": data.get("protocol", "HTTP"),
                "timeout_ms": data.get("timeout_ms", 1000)
            })

        return {"nodes": nodes, "edges": edges}

    def get_dependencies(self, service_id: str) -> List[str]:
        """Returns direct downstream dependencies called by service_id."""
        if service_id in self.graph:
            return list(self.graph.successors(service_id))
        return []

    def get_callers(self, service_id: str) -> List[str]:
        """Returns upstream callers that depend on service_id."""
        if service_id in self.graph:
            return list(self.graph.predecessors(service_id))
        return []

    def get_all_upstream_impacted(self, root_service: str) -> List[str]:
        """Finds all services upstream that are impacted when root_service fails."""
        # Reverse graph to traverse up callers
        reversed_g = self.graph.reverse()
        if root_service in reversed_g:
            descendants = nx.descendants(reversed_g, root_service)
            # Topological order in callers
            subgraph = reversed_g.subgraph(descendants | {root_service})
            try:
                order = list(nx.topological_sort(subgraph))
                return order
            except nx.NetworkXUnfeasible:
                return list(descendants)
        return []

    def get_propagation_chain(self, root_service: str) -> List[str]:
        """Returns propagation chain from root failure up to ingress gateway."""
        # E.g., ['payment-db', 'payment-service', 'order-service', 'api-gateway']
        upstream = self.get_all_upstream_impacted(root_service)
        if "api-gateway" in upstream and upstream[-1] != "api-gateway":
            upstream.remove("api-gateway")
            upstream.append("api-gateway")
        return upstream

    def get_service_criticality(self) -> Dict[str, Dict[str, Any]]:
        """
        Calculates service importance and criticality level:
        CRITICAL, HIGH, MEDIUM, LOW based on:
          - Downstream dependents count (traversing callers in reversed graph)
          - Centrality in customer-facing critical checkout path
          - Node role (gateway, transactional database, state machine)
        """
        reversed_g = self.graph.reverse()
        criticality_map = {}
        for node in self.graph.nodes:
            # Number of services that depend on this node
            dependents = len(nx.descendants(reversed_g, node))
            is_ingress = node == "api-gateway"
            is_critical_db = node == "payment-db"
            is_order_hub = node == "order-service"

            if is_ingress or is_critical_db or is_order_hub or dependents >= 3:
                level = "CRITICAL"
                badge_color = "#F43F5E"
            elif dependents >= 2 or node == "payment-service":
                level = "HIGH"
                badge_color = "#F59E0B"
            elif dependents >= 1 or node == "inventory-service":
                level = "MEDIUM"
                badge_color = "#22D3EE"
            else:
                level = "LOW"
                badge_color = "#22C55E"

            downstream_list = list(nx.descendants(reversed_g, node))
            criticality_map[node] = {
                "service_id": node,
                "name": self.graph.nodes[node].get("name", node),
                "level": level,
                "criticality_tier": level,
                "dependents_count": dependents,
                "downstream_dependent_count": dependents,
                "downstream_dependents": downstream_list,
                "badge_color": badge_color,
                "on_checkout_path": node in ["api-gateway", "order-service", "payment-service", "payment-db"],
                "is_critical_path": node in ["api-gateway", "order-service", "payment-service", "payment-db"],
                "failure_blast_impact": "CATASTROPHIC" if level == "CRITICAL" else "HIGH" if level == "HIGH" else "MODERATE",
                "description": f"{level} tier service with {dependents} downstream dependents"
            }
        return criticality_map

topology_graph = MicroserviceGraph()

if __name__ == "__main__":
    topo = topology_graph.get_topology()
    print("Nodes:", len(topo["nodes"]), "Edges:", len(topo["edges"]))
    chain = topology_graph.get_propagation_chain("payment-db")
    print("Payment-DB failure propagation chain:", " -> ".join(chain))
