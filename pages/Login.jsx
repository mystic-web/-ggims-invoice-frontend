import { useState } from "react";

export default function Login({ onLogin, api }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${api}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5f5" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:"2rem 2.5rem", width:360, boxShadow:"0 2px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
          <img src="/logo.png" alt="GGIMS" style={{ height:48, marginBottom:12 }} onError={e => e.target.style.display='none'} />
          <h1 style={{ fontSize:20, fontWeight:600, color:"#1a1a1a" }}>Invoice Manager</h1>
          <p style={{ fontSize:13, color:"#666", marginTop:4 }}>Go Global Immigration Services</p>
        </div>

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#dc2626" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:500, color:"#374151", display:"block", marginBottom:6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="accounts@ggims.com" required autoFocus
              style={{ width:"100%", padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:14, outline:"none" }}
            />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:500, color:"#374151", display:"block", marginBottom:6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{ width:"100%", padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:14, outline:"none" }}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"10px", background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
