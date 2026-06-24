import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, API, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Search,
  Download,
  LogOut,
  Users,
  TrendingUp,
  Activity,
  Filter,
  Eye,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

const AREA_COLORS = ["#A6258C", "#E91E8C", "#E5B009", "#7A1968", "#F39AC9", "#C99A00"];

const StatCard = ({ icon: Icon, label, value, accent = "teal" }) => (
  <Card className="p-6 card-soft border-slate-200/60 rounded-2xl bg-white">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">{label}</p>
        <p className="font-display text-3xl font-bold text-slate-900 mt-2">{value}</p>
      </div>
      <div className={`h-11 w-11 rounded-xl bg-${accent}-50 text-${accent}-700 flex items-center justify-center`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("ALL");
  const [region, setRegion] = useState("ALL");
  const [selected, setSelected] = useState(null);

  const fetchAll = async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        q: opts.q ?? q,
        area: opts.area ?? area,
        region: opts.region ?? region,
      };
      const [m, s] = await Promise.all([
        api.get("/members", { params }),
        api.get("/members/stats"),
      ]);
      setMembers(m.data.items || []);
      setStats(s.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e) => {
    e.preventDefault();
    fetchAll();
  };

  const regions = useMemo(() => {
    const set = new Set(members.map((m) => m.kabupaten_kota).filter(Boolean));
    return Array.from(set);
  }, [members]);

  const onExport = async (format) => {
    try {
      const token = localStorage.getItem("himponi_token");
      const params = new URLSearchParams({ format, q, area, region });
      const url = `${API}/members/export?${params.toString()}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Gagal mengunduh");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `himponi_members.${format === "xlsx" ? "xlsx" : "csv"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Data diekspor ke ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || "Export gagal");
    }
  };

  const doLogout = async () => {
    await logout();
    nav("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors position="top-center" />
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-800">{user?.name || "Admin"}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={doLogout}
              data-testid="logout-btn"
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4 mr-2" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" data-testid="admin-dashboard">
        {/* Heading */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">Dashboard Anggota</h1>
            <p className="text-slate-500 mt-1 text-sm">Kelola dan pantau data anggota HIMPONI DKI Jakarta.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onExport("csv")}
              data-testid="export-csv-btn"
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              <FileText className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button
              onClick={() => onExport("xlsx")}
              data-testid="export-xlsx-btn"
              className="bg-teal-700 hover:bg-teal-800 text-white"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Anggota" value={stats?.total ?? "—"} accent="teal" />
          <StatCard
            icon={TrendingUp}
            label="Pendaftar 7 hari terakhir"
            value={stats?.new_last_7_days ?? "—"}
            accent="sky"
          />
          <StatCard
            icon={Activity}
            label="Area Kerja Terbanyak"
            value={
              stats?.by_area_kerja?.length
                ? stats.by_area_kerja.reduce((a, b) => (b.value > a.value ? b : a)).name
                : "—"
            }
            accent="emerald"
          />
          <StatCard
            icon={Filter}
            label="Wilayah Berbeda"
            value={stats?.top_regions?.length ?? 0}
            accent="amber"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-6 card-soft border-slate-200/60 rounded-2xl bg-white">
            <div className="mb-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Distribusi Area Kerja</h3>
              <p className="text-xs text-slate-500">Jumlah anggota berdasarkan area kerja</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.by_area_kerja || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#475569" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#A6258C" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 card-soft border-slate-200/60 rounded-2xl bg-white">
            <div className="mb-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Sebaran Area Kerja</h3>
              <p className="text-xs text-slate-500">Persentase distribusi</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.by_area_kerja || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {(stats?.by_area_kerja || []).map((_, i) => (
                      <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-5 card-soft border-slate-200/60 rounded-2xl bg-white">
          <form onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Cari</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  data-testid="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama, rumah sakit, atau NIRA..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Area Kerja</label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger data-testid="filter-area" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="Kemoterapi">Kemoterapi</SelectItem>
                  <SelectItem value="Radioterapi">Radioterapi</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Wilayah</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger data-testid="filter-region" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Button
                type="submit"
                data-testid="search-btn"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white"
              >
                Cari
              </Button>
            </div>
          </form>
        </Card>

        {/* Table */}
        <Card className="card-soft border-slate-200/60 rounded-2xl bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900">Daftar Anggota</h3>
              <p className="text-xs text-slate-500">{members.length} hasil ditampilkan</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/60">
                  <TableHead>Nama</TableHead>
                  <TableHead>NIRA</TableHead>
                  <TableHead>Tempat Bekerja</TableHead>
                  <TableHead>Area Kerja</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400">Memuat data...</TableCell></TableRow>
                )}
                {!loading && members.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400">Belum ada data anggota.</TableCell></TableRow>
                )}
                {!loading && members.map((m) => (
                  <TableRow key={m.id} data-testid={`member-row-${m.id}`} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-medium text-slate-800">{m.nama_lengkap}</div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </TableCell>
                    <TableCell className="text-slate-700">{m.nira_ppni}</TableCell>
                    <TableCell className="text-slate-700">{m.tempat_bekerja}</TableCell>
                    <TableCell>
                      <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50 font-medium">
                        {m.area_kerja}
                        {m.area_kerja === "Lainnya" && m.area_kerja_lainnya ? `: ${m.area_kerja_lainnya}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700">{m.kabupaten_kota}</TableCell>
                    <TableCell>
                      {m.anggota_himponi === "Ya" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Anggota</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600">Calon</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(m)}
                        data-testid={`view-btn-${m.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl" data-testid="detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{selected?.nama_lengkap}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["NIRA PPNI", selected.nira_ppni],
                ["Tanggal Lahir", selected.tanggal_lahir],
                ["Jenis Kelamin", selected.jenis_kelamin],
                ["No HP", selected.no_hp],
                ["Email", selected.email],
                ["Pendidikan", selected.pendidikan_terakhir],
                ["Tempat Bekerja", selected.tempat_bekerja],
                ["Area Kerja", selected.area_kerja + (selected.area_kerja_lainnya ? `: ${selected.area_kerja_lainnya}` : "")],
                ["Kecamatan", selected.kecamatan],
                ["Kabupaten/Kota", selected.kabupaten_kota],
                ["Provinsi", selected.provinsi],
                ["Anggota Himponi", selected.anggota_himponi],
                ["Nomor Anggota", selected.nomor_anggota_himponi || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="text-slate-800 mt-1">{v}</p>
                </div>
              ))}
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wider text-slate-500">Alamat</p>
                <p className="text-slate-800 mt-1">{selected.alamat_lengkap}</p>
              </div>
              {selected.sertifikasi && Object.values(selected.sertifikasi).some(Boolean) && (
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Sertifikasi</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(selected.sertifikasi).filter(([, v]) => v).map(([k, v]) => (
                      <Badge key={k} className="bg-teal-50 text-teal-700">{k.replace(/_/g, " ")}: {v}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selected.custom_certificates?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Sertifikat Tambahan</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.custom_certificates.map((c, i) => (
                      <Badge key={i} variant="outline">{c.nama}{c.tahun ? ` (${c.tahun})` : ""}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
