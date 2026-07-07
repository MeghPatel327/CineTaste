"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Users, Shield, Link as LinkIcon, Trash } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [usersRes, sitesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/pirate-sites")
      ]);
      
      if (usersRes.ok) {
        setUsers((await usersRes.json()).data);
      } else {
        toast.error("Failed to load users. Try logging out and back in.");
      }
      
      if (sitesRes.ok) {
        setSites((await sitesRes.json()).data);
      } else {
        toast.error("Failed to load pirate sites");
      }
    } catch {
      toast.error("Error loading admin data");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (id: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Change role to ${newRole}?`)) return;
    
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    
    if (res.ok) {
      toast.success("Role updated");
      fetchAdminData();
    }
  };

  const toggleUserBlock = async (id: number, currentlyBlocked: boolean) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: !currentlyBlocked }),
    });
    
    if (res.ok) {
      toast.success("Block status updated");
      fetchAdminData();
    }
  };

  const addSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteUrl) return;

    const res = await fetch("/api/admin/pirate-sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSiteName, search_url: newSiteUrl, enabled: true }),
    });

    if (res.ok) {
      toast.success("Site added");
      setNewSiteName("");
      setNewSiteUrl("");
      fetchAdminData();
    } else {
      toast.error("Failed to add site");
    }
  };

  const deleteSite = async (id: number) => {
    if (!confirm("Delete site?")) return;
    const res = await fetch(`/api/admin/pirate-sites/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Site deleted");
      fetchAdminData();
    }
  };

  const toggleSiteEnabled = async (id: number, current: boolean) => {
    const res = await fetch(`/api/admin/pirate-sites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !current }),
    });
    if (res.ok) fetchAdminData();
  };

  if (loading) return <LoadingState message="Loading admin dashboard..." />;

  return (
    <div className="container mx-auto p-4 max-w-6xl py-8 space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="text-primary"/> Admin Dashboard</h1>
        <Link href="/dashboard"><Button variant="outline">Back to App</Button></Link>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Users /> Users</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-4">Username</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-4 font-medium">{u.username}</td>
                  <td className="p-4 capitalize">
                    <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.blocked ? <span className="text-destructive">Blocked</span> : <span className="text-green-500">Active</span>}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateUserRole(u.id, u.role)}>
                      Make {u.role === 'admin' ? 'User' : 'Admin'}
                    </Button>
                    <Button size="sm" variant={u.blocked ? "default" : "destructive"} onClick={() => toggleUserBlock(u.id, u.blocked)}>
                      {u.blocked ? 'Unblock' : 'Block'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><LinkIcon /> Pirate Sites (Search Templates)</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-bold mb-4">Add Template</h3>
            <form onSubmit={addSite} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={newSiteName} onChange={e => setNewSiteName(e.target.value)} placeholder="e.g. 1337x" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Search URL Template</label>
                <Input value={newSiteUrl} onChange={e => setNewSiteUrl(e.target.value)} placeholder="https://example.com/search?q={query}" required />
                <p className="text-xs text-muted-foreground mt-1">Use {'{query}'} where the movie name should go.</p>
              </div>
              <Button type="submit">Add Site</Button>
            </form>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Enabled</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4">
                      <Button size="sm" variant="outline" onClick={() => toggleSiteEnabled(s.id, s.enabled)}>
                        {s.enabled ? 'Yes' : 'No'}
                      </Button>
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="destructive" onClick={() => deleteSite(s.id)}><Trash className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
