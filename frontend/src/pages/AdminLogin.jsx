import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Login berhasil");
      nav("/admin");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <Toaster richColors position="top-center" />
      {/* Left visual */}
      <div className="hidden lg:flex teal-gradient text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="hero-pattern absolute inset-0 opacity-30" />
        <div className="relative">
          <Brand size="large" />
        </div>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Database Anggota
            <br />
            <span className="text-teal-100">HIMPONI DKI Jakarta</span>
          </h2>
          <p className="mt-4 text-teal-50 text-sm max-w-md">
            Panel administrasi untuk mengelola data anggota, melihat statistik area kerja, dan mengunduh laporan.
          </p>
        </div>
        <div className="relative text-xs text-teal-100/80">
          © {new Date().getFullYear()} Himpunan Perawat Onkologi Indonesia
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-700 mb-8">
            <ArrowLeft className="h-4 w-4" /> Kembali ke form pendaftaran
          </Link>
          <div className="mb-8 lg:hidden"><Brand size="large" /></div>
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">Admin Login</h1>
          <p className="text-sm text-slate-500 mb-8">Masuk untuk mengelola database anggota.</p>

          <Card className="p-6 sm:p-8 card-soft border-slate-200/60 rounded-2xl">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">Email</Label>
                <Input
                  data-testid="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@himponi-dki.org"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">Password</Label>
                <Input
                  data-testid="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                data-testid="login-submit"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white py-6 rounded-xl"
              >
                <Lock className="h-4 w-4 mr-2" /> {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
