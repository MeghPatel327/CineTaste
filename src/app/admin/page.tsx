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
import { GeminiHealthCard } from "@/features/admin/components/GeminiHealthCard";

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
      <div className="p-4 md:p-8 max-w-6xl mx-auto page-enter space-y-10">
        {loading ? (
          <div className="space-y-10">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>
            <section className="space-y-4">
              <Skeleton className="h-7 w-32" />
              <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/[0.03]"><tr>{Array.from({length:5}).map((_,i)=><th key={i} className="p-4"><Skeleton className="h-4 w-full"/></th>)}</tr></thead>
                  <tbody>{Array.from({length:4}).map((_,i)=><TableRowSkeleton key={i} cols={5}/>)}</tbody>
                </table>
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
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
              <div>
                <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Shield className="w-6 h-6" />
                  </span>
                  Admin Console
                </h1>
                <p className="text-sm text-[#A1AAA6] mt-1">
                  Manage core system health, user privileges, and streaming search indexers.
                </p>
              </div>
            </div>

            <section>
              <GeminiHealthCard />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-heading font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> User Directory
                </h2>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#A1AAA6]">
                  {users.length} registered
                </span>
              </div>

              <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-x-auto shadow-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-[#A1AAA6] border-b border-white/[0.06]">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Created</th>
                      <th className="p-4 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.map((u, index) => (
                      <tr key={u.id} className="ct-table-row-stagger hover:bg-white/[0.02] transition-colors" style={staggerStyle(index)}>
                        <td className="p-4 font-medium text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300">
                              {u.username?.slice(0, 2).toUpperCase() || "CT"}
                            </div>
                            <span>{u.username}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${u.role === 'admin' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.05] border-white/[0.08] text-white/70'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.blocked ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30">Blocked</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Active</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-[#A1AAA6]">
                          {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-xs h-7 border-white/[0.1] hover:bg-white/[0.05]" onClick={() => updateUserRole(u.id, u.role)}>
                              Make {u.role === 'admin' ? 'User' : 'Admin'}
                            </Button>
                            <Button size="sm" variant={u.blocked ? "default" : "destructive"} className="text-xs h-7" onClick={() => toggleUserBlock(u.id, u.blocked)}>
                              {u.blocked ? 'Unblock' : 'Block'}
                            </Button>
                            <div className="flex gap-1.5 items-center mt-1 sm:mt-0">
                              <input
                                type="password"
                                placeholder="Reset pwd"
                                value={resetPasswords[u.id] ?? ""}
                                onChange={e => setResetPasswords(prev => ({ ...prev, [u.id]: e.target.value }))}
                                className="h-7 text-xs rounded-lg border border-white/[0.1] bg-[#08090C] px-2 w-28 focus:outline-none focus:ring-1 focus:ring-emerald-400 text-white placeholder:text-white/30"
                              />
                              <Button size="sm" variant="secondary" className="text-xs h-7 bg-white/[0.08] hover:bg-white/[0.15] text-white" disabled={resettingId === u.id} onClick={() => resetPassword(u.id)}>
                                <KeyRound className="w-3 h-3 mr-1 text-emerald-400" />{resettingId === u.id ? "..." : "Set"}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-heading font-semibold text-white flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-emerald-400" /> Pirate & Streaming Search Templates
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] shadow-xl space-y-4">
                  <div>
                    <h3 className="font-heading font-semibold text-white">Add Search Template</h3>
                    <p className="text-xs text-[#A1AAA6] mt-0.5">Define link templates for external streaming indexing.</p>
                  </div>
                  <form onSubmit={addSite} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-[#A1AAA6] mb-1.5 block">Source Name</label>
                      <Input value={newSiteName} onChange={e => setNewSiteName(e.target.value)} placeholder="e.g. 1337x" required className="bg-[#08090C] border-white/[0.1]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#A1AAA6] mb-1.5 block">Search URL Template</label>
                      <Input value={newSiteUrl} onChange={e => setNewSiteUrl(e.target.value)} placeholder="https://example.com/search?q={q}" required className="bg-[#08090C] border-white/[0.1]" />
                      <p className="text-[11px] text-muted-foreground mt-1">Use <code className="text-emerald-400">{"{q}"}</code> where the movie title is interpolated.</p>
                    </div>
                    <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                      Add Source Template
                    </Button>
                  </form>
                </div>

                <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-[#A1AAA6] border-b border-white/[0.06]">
                      <tr>
                        <th className="p-4">Source</th>
                        <th className="p-4">Active</th>
                        <th className="p-4 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {sites.map((s, index) => (
                        <tr key={s.id} className="ct-table-row-stagger hover:bg-white/[0.02] transition-colors" style={staggerStyle(index)}>
                          <td className="p-4 font-medium text-white">{s.name}</td>
                          <td className="p-4">
                            <button
                              onClick={() => toggleSiteEnabled(s.id, s.enabled)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                s.enabled
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                  : 'bg-white/[0.05] border border-white/[0.08] text-white/50 hover:bg-white/[0.1]'
                              }`}
                            >
                              {s.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 w-8 p-0" onClick={() => deleteSite(s.id)}>
                              <Trash className="w-4 h-4" />
                            </Button>
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
