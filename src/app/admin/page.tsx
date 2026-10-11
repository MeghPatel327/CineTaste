"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ui/ErrorState";
import { TableRowSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Users, Shield, Link as LinkIcon, Trash, KeyRound } from "lucide-react";

const staggerStyle = (index: number, step = 45) => ({
  "--ct-stagger-delay": `${index * step}ms`,
} as CSSProperties);

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  // Reset password state: key = user id, value = input string
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({});
  const [resettingId, setResettingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [usersRes, sitesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/pirate-sites")
      ]);
      
      if (usersRes.ok) {
        setUsers((await usersRes.json()).data);
      } else {
        throw new Error("Failed to load users");
      }
      
      if (sitesRes.ok) {
        setSites((await sitesRes.json()).data);
      } else {
        throw new Error("Failed to load pirate sites");
      }
    } catch {
      setError(true);
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

  const resetPassword = async (id: number) => {
    const newPassword = resetPasswords[id]?.trim();
    if (!newPassword || newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setResettingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        toast.success("Password reset successfully");
        setResetPasswords(prev => { const n = { ...prev }; delete n[id]; return n; });
      } else {
        const json = await res.json();
        toast.error(json.message || "Failed to reset password");
      }
    } catch { toast.error("Error resetting password"); }
    finally { setResettingId(null); }
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

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto page-enter">
        {loading ? (
          <div className="space-y-12">
            <Skeleton className="h-9 w-64" />
            <section>
              <Skeleton className="h-7 w-32 mb-4" />
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary"><tr>{Array.from({length:6}).map((_,i)=><th key={i} className="p-4"><Skeleton className="h-4 w-full"/></th>)}</tr></thead>
                  <tbody>{Array.from({length:4}).map((_,i)=><TableRowSkeleton key={i} cols={6}/>)}</tbody>
                </table>
              </div>
            </section>
            <section>
              <Skeleton className="h-7 w-48 mb-4" />
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                  <Skeleton className="h-5 w-24" />
                  {Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-9 w-full"/>)}
                  <Skeleton className="h-9 w-24" />
                </div>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-secondary"><tr>{Array.from({length:3}).map((_,i)=><th key={i} className="p-4"><Skeleton className="h-4 w-full"/></th>)}</tr></thead>
                    <tbody>{Array.from({length:3}).map((_,i)=><TableRowSkeleton key={i} cols={3}/>)}</tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        ) : error ? (
          <ErrorState
            title="Admin data failed to load"
            message="We couldn't load the admin dashboard. Try logging out and back in."
            onRetry={fetchAdminData}
          />
        ) : (
          <div className="space-y-12">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="text-primary"/> Admin Dashboard</h1>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Users /> Users</h2>
              <div className="ct-accent-border p-0 sm:p-0">
                <table className="w-full text-left">
                  <thead className="bg-secondary text-secondary-foreground">
                    <tr>
                      <th className="p-4">Username</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined</th>
                      <th className="p-4">Actions</th>
                    </tr>                  </thead>
                  <tbody>
                    {users.map((u, index) => (
                      <tr key={u.id} className="ct-table-row-stagger border-t border-border" style={staggerStyle(index)}>
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
                        <td className="p-4 flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => updateUserRole(u.id, u.role)}>
                            Make {u.role === 'admin' ? 'User' : 'Admin'}
                          </Button>
                          <Button size="sm" variant={u.blocked ? "default" : "destructive"} onClick={() => toggleUserBlock(u.id, u.blocked)}>
                            {u.blocked ? 'Unblock' : 'Block'}
                          </Button>
                          <div className="flex gap-1 items-center mt-1 w-full">
                            <input
                              type="password"
                              placeholder="New password"
                              value={resetPasswords[u.id] ?? ""}
                              onChange={e => setResetPasswords(prev => ({ ...prev, [u.id]: e.target.value }))}
                              className="h-8 text-xs rounded-md border border-input bg-background px-2 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <Button size="sm" variant="secondary" disabled={resettingId === u.id} onClick={() => resetPassword(u.id)}>
                              <KeyRound className="w-3.5 h-3.5 mr-1" />{resettingId === u.id ? "..." : "Reset"}
                            </Button>
                          </div>
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
                <div className="ct-accent-border">
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

                <div className="ct-accent-border p-0 sm:p-0">
                  <table className="w-full text-left">
                    <thead className="bg-secondary text-secondary-foreground">
                      <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Enabled</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sites.map((s, index) => (
                        <tr key={s.id} className="ct-table-row-stagger border-t border-border" style={staggerStyle(index)}>
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
        )}
      </div>
    </AppShell>
  );
}
