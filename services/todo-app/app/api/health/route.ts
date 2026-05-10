import { NextResponse } from "next/server";
import { hostname } from "os";

export async function GET() {
  return NextResponse.json({ status: "ok", hostname: hostname() });
}