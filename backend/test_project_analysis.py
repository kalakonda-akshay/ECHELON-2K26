from backend.project_manager import project_manager

def test_sample_projects():
    # 1. Test MyShop Microservices
    myshop = project_manager.load_sample_project('sample-myshop-microservices')
    assert myshop['id'] == 'sample-myshop-microservices'
    assert myshop['total_services'] == 5
    assert myshop['readiness']['readiness_percentage'] == 65
    assert len(myshop['dependencies']) >= 5
    print('PASS: sample-myshop-microservices')

    # 2. Test FastAPI Service
    fastapi = project_manager.load_sample_project('sample-fastapi-service')
    assert fastapi['id'] == 'sample-fastapi-service'
    assert fastapi['total_services'] == 2
    assert 'FastAPI' in fastapi['frameworks']
    assert len(fastapi['routes']) >= 3
    print('PASS: sample-fastapi-service')

    # 3. Test Express Payment
    express = project_manager.load_sample_project('sample-express-payment')
    assert express['id'] == 'sample-express-payment'
    assert 'Express' in express['frameworks']
    assert len(express['routes']) >= 3
    print('PASS: sample-express-payment')

    # 4. Test list_projects includes demo and all 3 samples
    projs = project_manager.list_projects()
    proj_ids = [p['id'] for p in projs]
    assert 'FoodDelivery-Demo' in proj_ids
    assert 'sample-myshop-microservices' in proj_ids
    assert 'sample-fastapi-service' in proj_ids
    assert 'sample-express-payment' in proj_ids
    print('PASS: list_projects with Demo and fixtures')

    # 5. Test telemetry ingestion normalization
    telemetry_resp = project_manager.ingest_telemetry('sample-myshop-microservices', {
        'metrics': {
            'api-gateway': {'latency': 45.2, 'error_rate': 0.5}
        }
    })
    assert telemetry_resp['status'] == 'INGESTED'
    print('PASS: telemetry normalization')

if __name__ == '__main__':
    test_sample_projects()
    print('ALL PROJECT ANALYSIS TESTS PASSED')
