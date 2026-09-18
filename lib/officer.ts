/**
 * Stand-in for the officer profile that would normally come from a
 * Supabase `officers` table joined against `auth.users`.
 *
 * TODO(supabase): replace with a query such as:
 *   const { data: { user } } = await supabase.auth.getUser();
 *   const { data: officer } = await supabase
 *     .from("officers")
 *     .select("name, role, jurisdiction")
 *     .eq("user_id", user.id)
 *     .single();
 */
export interface MockOfficer {
  name: string;
  email: string;
  role: "Health Officer" | "Building Regulator";
  jurisdiction: string;
}

export const mockOfficer: MockOfficer = {
  name: "J. Alvarez",
  email: "j.alvarez@ashfordcounty.gov",
  role: "Health Officer",
  jurisdiction: "Ashford County",
};
