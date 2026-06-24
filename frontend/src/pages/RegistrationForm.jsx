import { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";

const PENDIDIKAN_OPTIONS = [
  "D3 Keperawatan",
  "D4 Keperawatan",
  "S1 Keperawatan + Ners",
  "S2 Keperawatan",
  "S3 Keperawatan",
];

const SERT_LABELS = {
  kanker_dasar: "Kanker Dasar",
  kemoterapi: "Kemoterapi",
  paliatif: "Paliatif",
  radioterapi: "Radioterapi",
  bedah: "Bedah",
  napak: "Napak",
};

const initialForm = {
  nama_lengkap: "",
  nira_ppni: "",
  tanggal_lahir: "",
  jenis_kelamin: "",
  no_hp: "",
  email: "",
  alamat_lengkap: "",
  kecamatan: "",
  kabupaten_kota: "",
  provinsi: "DKI Jakarta",
  pendidikan_terakhir: "",
  tempat_bekerja: "",
  area_kerja: "",
  area_kerja_lainnya: "",
  sertifikasi: { kanker_dasar: "", kemoterapi: "", paliatif: "", radioterapi: "", bedah: "", napak: "" },
  custom_certificates: [],
  anggota_himponi: "",
  nomor_anggota_himponi: "",
};

const SectionCard = ({ title, subtitle, children, step }) => (
  <Card className="p-6 sm:p-8 card-soft border-slate-200/60 bg-white rounded-2xl">
    <div className="mb-6 flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-700 font-semibold flex items-center justify-center font-display">
        {step}
      </div>
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
    <div className="space-y-5">{children}</div>
  </Card>
);

const Field = ({ label, required, children, hint }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-slate-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

export default function RegistrationForm() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateSert = (k, v) => setForm((f) => ({ ...f, sertifikasi: { ...f.sertifikasi, [k]: v } }));

  const addCustomCert = () => {
    if (form.custom_certificates.length >= 10) {
      toast.error("Maksimal 10 sertifikat tambahan");
      return;
    }
    setForm((f) => ({
      ...f,
      custom_certificates: [...f.custom_certificates, { nama: "", tahun: "" }],
    }));
  };
  const removeCustomCert = (i) =>
    setForm((f) => ({
      ...f,
      custom_certificates: f.custom_certificates.filter((_, idx) => idx !== i),
    }));
  const updateCustomCert = (i, k, v) =>
    setForm((f) => ({
      ...f,
      custom_certificates: f.custom_certificates.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)),
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const required = [
      "nama_lengkap",
      "nira_ppni",
      "tanggal_lahir",
      "jenis_kelamin",
      "no_hp",
      "email",
      "alamat_lengkap",
      "kecamatan",
      "kabupaten_kota",
      "provinsi",
      "pendidikan_terakhir",
      "tempat_bekerja",
      "area_kerja",
      "anggota_himponi",
    ];
    for (const k of required) {
      if (!String(form[k] || "").trim()) {
        toast.error(`Mohon lengkapi field: ${k.replace(/_/g, " ")}`);
        return;
      }
    }
    if (form.area_kerja === "Lainnya" && !form.area_kerja_lainnya.trim()) {
      toast.error("Mohon isi keterangan Area Kerja Lainnya");
      return;
    }
    if (form.anggota_himponi === "Ya" && !form.nomor_anggota_himponi.trim()) {
      toast.error("Mohon isi Nomor Anggota Himponi");
      return;
    }

    const sert = {};
    for (const k of Object.keys(form.sertifikasi)) {
      const v = form.sertifikasi[k];
      if (v) sert[k] = Number(v);
    }
    const customs = form.custom_certificates
      .filter((c) => c.nama.trim())
      .map((c) => ({ nama: c.nama.trim(), tahun: c.tahun ? Number(c.tahun) : null }));

    const payload = {
      ...form,
      sertifikasi: sert,
      custom_certificates: customs,
      area_kerja_lainnya: form.area_kerja === "Lainnya" ? form.area_kerja_lainnya : null,
      nomor_anggota_himponi: form.anggota_himponi === "Ya" ? form.nomor_anggota_himponi : null,
    };

    setSubmitting(true);
    try {
      await api.post("/members", payload);
      setSubmitted(true);
      toast.success("Pendaftaran berhasil disimpan");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 hero-pattern flex items-center justify-center px-4">
        <Card className="max-w-lg w-full p-8 sm:p-12 text-center card-soft bg-white rounded-2xl">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">Terima Kasih!</h1>
          <p className="text-slate-600 mb-6">
            Pendaftaran Anda sebagai calon anggota HIMPONI DKI Jakarta telah kami terima. Tim kami akan memverifikasi data dan menghubungi Anda melalui email/WhatsApp.
          </p>
          <Button
            onClick={() => {
              setForm(initialForm);
              setSubmitted(false);
            }}
            data-testid="register-again-btn"
            className="bg-teal-700 hover:bg-teal-800 text-white"
          >
            Daftarkan Anggota Lain
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors position="top-center" />
      {/* Hero */}
      <div className="teal-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Brand size="large" variant="onDark" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Pendaftaran Anggota
              <br />
              <span className="text-teal-100">HIMPONI DKI Jakarta</span>
            </h1>
            <p className="mt-3 text-teal-50 text-sm sm:text-base max-w-xl">
              Himpunan Perawat Onkologi Indonesia — Cabang DKI Jakarta. Bergabunglah dengan komunitas perawat onkologi profesional.
            </p>
          </div>
          <Link
            to="/admin/login"
            data-testid="admin-login-link"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm text-white transition-colors"
          >
            <ShieldCheck className="h-4 w-4" /> Admin Login
          </Link>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <SectionCard step="1" title="Data Pribadi" subtitle="Informasi identitas anggota">
          <Field label="Nama Lengkap (dengan gelar)" required>
            <Input
              data-testid="input-nama-lengkap"
              value={form.nama_lengkap}
              onChange={(e) => update("nama_lengkap", e.target.value)}
              placeholder="Ns. Sari Wulandari, S.Kep."
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="NIRA PPNI" required>
              <Input
                data-testid="input-nira"
                value={form.nira_ppni}
                onChange={(e) => update("nira_ppni", e.target.value)}
                inputMode="numeric"
                placeholder="1234567890"
              />
            </Field>
            <Field label="Tanggal Lahir" required>
              <Input
                data-testid="input-tgl-lahir"
                type="date"
                value={form.tanggal_lahir}
                onChange={(e) => update("tanggal_lahir", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Jenis Kelamin" required>
            <Select value={form.jenis_kelamin} onValueChange={(v) => update("jenis_kelamin", v)}>
              <SelectTrigger data-testid="select-jk"><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                <SelectItem value="Perempuan">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="No. HP / WhatsApp" required>
              <Input
                data-testid="input-hp"
                value={form.no_hp}
                onChange={(e) => update("no_hp", e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </Field>
            <Field label="Email" required>
              <Input
                data-testid="input-email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="nama@email.com"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard step="2" title="Alamat" subtitle="Domisili anggota">
          <Field label="Alamat Lengkap" required>
            <Textarea
              data-testid="input-alamat"
              rows={3}
              value={form.alamat_lengkap}
              onChange={(e) => update("alamat_lengkap", e.target.value)}
              placeholder="Jl., RT/RW, kelurahan, dsb."
            />
          </Field>
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Kecamatan" required>
              <Input data-testid="input-kecamatan" value={form.kecamatan} onChange={(e) => update("kecamatan", e.target.value)} />
            </Field>
            <Field label="Kabupaten/Kota" required>
              <Input data-testid="input-kota" value={form.kabupaten_kota} onChange={(e) => update("kabupaten_kota", e.target.value)} />
            </Field>
            <Field label="Provinsi" required>
              <Input data-testid="input-provinsi" value={form.provinsi} onChange={(e) => update("provinsi", e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard step="3" title="Pendidikan & Tempat Kerja" subtitle="Profil profesional">
          <Field label="Pendidikan Terakhir" required>
            <Select value={form.pendidikan_terakhir} onValueChange={(v) => update("pendidikan_terakhir", v)}>
              <SelectTrigger data-testid="select-pendidikan"><SelectValue placeholder="Pilih pendidikan" /></SelectTrigger>
              <SelectContent>
                {PENDIDIKAN_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tempat Bekerja / Rumah Sakit" required>
            <Input
              data-testid="input-tempat-kerja"
              value={form.tempat_bekerja}
              onChange={(e) => update("tempat_bekerja", e.target.value)}
              placeholder="Nama Rumah Sakit / Instansi"
            />
          </Field>
          <Field label="Area Kerja" required>
            <RadioGroup
              value={form.area_kerja}
              onValueChange={(v) => update("area_kerja", v)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {["Kemoterapi", "Radioterapi", "Lainnya"].map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition ${
                    form.area_kerja === opt ? "border-teal-600 bg-teal-50/60" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <RadioGroupItem value={opt} data-testid={`radio-area-${opt.toLowerCase()}`} />
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              ))}
            </RadioGroup>
            {form.area_kerja === "Lainnya" && (
              <Input
                data-testid="input-area-lainnya"
                className="mt-3"
                value={form.area_kerja_lainnya}
                onChange={(e) => update("area_kerja_lainnya", e.target.value)}
                placeholder="Sebutkan area kerja lainnya"
              />
            )}
          </Field>
        </SectionCard>

        <SectionCard step="4" title="Sertifikasi / Pelatihan" subtitle="Opsional — isi tahun kelulusan jika ada">
          <div className="grid sm:grid-cols-2 gap-5">
            {Object.entries(SERT_LABELS).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  data-testid={`input-sert-${key}`}
                  type="number"
                  min="1970"
                  max="2099"
                  placeholder="Tahun (mis. 2020)"
                  value={form.sertifikasi[key]}
                  onChange={(e) => updateSert(key, e.target.value)}
                />
              </Field>
            ))}
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold text-slate-800">Sertifikat Lainnya</h3>
                <p className="text-xs text-slate-500">Tambahkan hingga 10 sertifikat / pelatihan lain</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addCustomCert}
                data-testid="btn-add-cert"
                className="border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </div>
            <div className="space-y-3">
              {form.custom_certificates.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <Input
                    className="col-span-7"
                    placeholder="Nama sertifikat"
                    value={c.nama}
                    onChange={(e) => updateCustomCert(i, "nama", e.target.value)}
                    data-testid={`input-cert-nama-${i}`}
                  />
                  <Input
                    className="col-span-4"
                    type="number"
                    placeholder="Tahun"
                    value={c.tahun}
                    onChange={(e) => updateCustomCert(i, "tahun", e.target.value)}
                    data-testid={`input-cert-tahun-${i}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-1 text-rose-500 hover:bg-rose-50"
                    onClick={() => removeCustomCert(i)}
                    data-testid={`btn-remove-cert-${i}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {form.custom_certificates.length === 0 && (
                <p className="text-xs text-slate-400 italic">Belum ada sertifikat tambahan.</p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard step="5" title="Keanggotaan Organisasi" subtitle="Status keanggotaan HIMPONI">
          <Field label="Apakah Anda sudah Anggota Himponi?" required>
            <RadioGroup
              value={form.anggota_himponi}
              onValueChange={(v) => update("anggota_himponi", v)}
              className="flex gap-3"
            >
              {["Ya", "Tidak"].map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2 border rounded-xl px-5 py-3 cursor-pointer transition ${
                    form.anggota_himponi === opt ? "border-teal-600 bg-teal-50/60" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <RadioGroupItem value={opt} data-testid={`radio-anggota-${opt.toLowerCase()}`} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </RadioGroup>
          </Field>
          {form.anggota_himponi === "Ya" && (
            <Field label="Nomor Anggota Himponi" required>
              <Input
                data-testid="input-nomor-anggota"
                value={form.nomor_anggota_himponi}
                onChange={(e) => update("nomor_anggota_himponi", e.target.value)}
                placeholder="Nomor anggota"
              />
            </Field>
          )}
        </SectionCard>

        <div className="flex justify-end pb-12">
          <Button
            type="submit"
            disabled={submitting}
            data-testid="reg-form-submit"
            className="bg-teal-700 hover:bg-teal-800 text-white px-8 py-6 text-base rounded-xl"
          >
            {submitting ? "Mengirim..." : "Kirim Pendaftaran"}
          </Button>
        </div>
      </form>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} HIMPONI DKI Jakarta — Himpunan Perawat Onkologi Indonesia
      </footer>
    </div>
  );
}
