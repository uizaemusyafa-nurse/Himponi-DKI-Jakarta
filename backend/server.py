from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt as pyjwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from openpyxl import Workbook

# ---------- Setup ----------
mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="HIMPONI DKI Jakarta Member Database")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------- Models ----------
class Sertifikasi(BaseModel):
    kanker_dasar: Optional[int] = None
    kemoterapi: Optional[int] = None
    paliatif: Optional[int] = None
    radioterapi: Optional[int] = None
    bedah: Optional[int] = None
    napak: Optional[int] = None


class CustomCertificate(BaseModel):
    nama: str
    tahun: Optional[int] = None


class MemberCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nama_lengkap: str
    nira_ppni: str
    tanggal_lahir: str  # ISO date string YYYY-MM-DD
    jenis_kelamin: str  # Laki-laki | Perempuan
    no_hp: str
    email: EmailStr
    alamat_lengkap: str
    kecamatan: str
    kabupaten_kota: str
    provinsi: str = "DKI Jakarta"
    pendidikan_terakhir: str
    tempat_bekerja: str
    area_kerja: str  # Kemoterapi | Radioterapi | Lainnya
    area_kerja_lainnya: Optional[str] = None
    sertifikasi: Sertifikasi = Field(default_factory=Sertifikasi)
    custom_certificates: List[CustomCertificate] = Field(default_factory=list)
    anggota_himponi: str  # Ya | Tidak
    nomor_anggota_himponi: Optional[str] = None


class Member(MemberCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Auth helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi habis, silakan login ulang")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.admins.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Akun admin tidak ditemukan")
    return user


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.members.create_index("email")
    await db.members.create_index("nira_ppni")
    await db.admins.create_index("email", unique=True)
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.admins.find_one({"email": admin_email})
    if not existing:
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrator HIMPONI",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin account: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.admins.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info(f"Updated admin password for: {admin_email}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------- Auth endpoints ----------
@api.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.admins.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token(user["id"], email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=12 * 3600,
        path="/",
    )
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(admin=Depends(get_current_admin)):
    return admin


# ---------- Member endpoints ----------
@api.post("/members", status_code=201)
async def create_member(payload: MemberCreate):
    # validations
    if payload.anggota_himponi == "Ya" and not (payload.nomor_anggota_himponi or "").strip():
        raise HTTPException(status_code=400, detail="Nomor Anggota Himponi wajib diisi jika memilih 'Ya'")
    if payload.area_kerja == "Lainnya" and not (payload.area_kerja_lainnya or "").strip():
        raise HTTPException(status_code=400, detail="Mohon isi keterangan Area Kerja 'Lainnya'")
    if len(payload.custom_certificates) > 10:
        raise HTTPException(status_code=400, detail="Maksimal 10 sertifikat tambahan")

    member = Member(**payload.model_dump())
    doc = member.model_dump()
    await db.members.insert_one(doc)
    return {"id": member.id, "message": "Pendaftaran berhasil disimpan"}


def _build_member_filter(q: Optional[str], area: Optional[str], region: Optional[str]) -> dict:
    f: dict = {}
    if q:
        rx = {"$regex": q.strip(), "$options": "i"}
        f["$or"] = [
            {"nama_lengkap": rx},
            {"tempat_bekerja": rx},
            {"nira_ppni": rx},
        ]
    if area and area != "ALL":
        f["area_kerja"] = area
    if region and region != "ALL":
        f["kabupaten_kota"] = {"$regex": region, "$options": "i"}
    return f


@api.get("/members")
async def list_members(
    admin=Depends(get_current_admin),
    q: Optional[str] = None,
    area: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = Query(500, le=2000),
):
    filt = _build_member_filter(q, area, region)
    cursor = db.members.find(filt, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"total": len(items), "items": items}


@api.get("/members/stats")
async def member_stats(admin=Depends(get_current_admin)):
    total = await db.members.count_documents({})
    pipeline = [{"$group": {"_id": "$area_kerja", "count": {"$sum": 1}}}]
    by_area_raw = await db.members.aggregate(pipeline).to_list(length=50)
    by_area = [{"name": x["_id"] or "Tidak diisi", "value": x["count"]} for x in by_area_raw]

    pipeline_region = [{"$group": {"_id": "$kabupaten_kota", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 10}]
    by_region_raw = await db.members.aggregate(pipeline_region).to_list(length=10)
    by_region = [{"name": x["_id"] or "Tidak diisi", "value": x["count"]} for x in by_region_raw]

    pipeline_edu = [{"$group": {"_id": "$pendidikan_terakhir", "count": {"$sum": 1}}}]
    by_edu_raw = await db.members.aggregate(pipeline_edu).to_list(length=20)
    by_edu = [{"name": x["_id"] or "Tidak diisi", "value": x["count"]} for x in by_edu_raw]

    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_count = await db.members.count_documents({"created_at": {"$gte": seven_days_ago}})

    return {
        "total": total,
        "new_last_7_days": new_count,
        "by_area_kerja": by_area,
        "top_regions": by_region,
        "by_pendidikan": by_edu,
    }


EXPORT_COLUMNS = [
    ("nama_lengkap", "Nama Lengkap"),
    ("nira_ppni", "NIRA PPNI"),
    ("tanggal_lahir", "Tanggal Lahir"),
    ("jenis_kelamin", "Jenis Kelamin"),
    ("no_hp", "No. HP / WhatsApp"),
    ("email", "Email"),
    ("alamat_lengkap", "Alamat"),
    ("kecamatan", "Kecamatan"),
    ("kabupaten_kota", "Kabupaten/Kota"),
    ("provinsi", "Provinsi"),
    ("pendidikan_terakhir", "Pendidikan"),
    ("tempat_bekerja", "Tempat Bekerja"),
    ("area_kerja", "Area Kerja"),
    ("area_kerja_lainnya", "Area Kerja Lainnya"),
    ("anggota_himponi", "Anggota Himponi"),
    ("nomor_anggota_himponi", "Nomor Anggota"),
    ("created_at", "Tanggal Daftar"),
]


@api.get("/members/export")
async def export_members(
    admin=Depends(get_current_admin),
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    q: Optional[str] = None,
    area: Optional[str] = None,
    region: Optional[str] = None,
):
    filt = _build_member_filter(q, area, region)
    items = await db.members.find(filt, {"_id": 0}).sort("created_at", -1).to_list(length=10000)

    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([h for _, h in EXPORT_COLUMNS] + ["Sertifikasi", "Sertifikat Tambahan"])
        for m in items:
            cert = m.get("sertifikasi") or {}
            cert_str = "; ".join(f"{k}:{v}" for k, v in cert.items() if v)
            custom = m.get("custom_certificates") or []
            custom_str = "; ".join(f"{c.get('nama','')}({c.get('tahun','')})" for c in custom)
            writer.writerow([m.get(k, "") or "" for k, _ in EXPORT_COLUMNS] + [cert_str, custom_str])
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=himponi_members.csv"},
        )

    # xlsx
    wb = Workbook()
    ws = wb.active
    ws.title = "Anggota HIMPONI"
    headers = [h for _, h in EXPORT_COLUMNS] + ["Sertifikasi", "Sertifikat Tambahan"]
    ws.append(headers)
    for m in items:
        cert = m.get("sertifikasi") or {}
        cert_str = "; ".join(f"{k}:{v}" for k, v in cert.items() if v)
        custom = m.get("custom_certificates") or []
        custom_str = "; ".join(f"{c.get('nama','')}({c.get('tahun','')})" for c in custom)
        ws.append([m.get(k, "") or "" for k, _ in EXPORT_COLUMNS] + [cert_str, custom_str])
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=himponi_members.xlsx"},
    )


@api.get("/")
async def root():
    return {"app": "HIMPONI DKI Jakarta Member Database", "status": "ok"}


# Include router and CORS
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
