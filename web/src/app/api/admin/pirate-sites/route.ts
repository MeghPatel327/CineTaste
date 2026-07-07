import { NextRequest } from "next/server";
import { getPirateSites, addPirateSite } from "@/features/admin/adminRepository";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { z } from "zod";

const addSiteSchema = z.object({
  name: z.string().min(1),
  search_url: z.string().url(),
  enabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  // Allow normal users to GET pirate sites for generating search links
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const sites = await getPirateSites();
    return successResponse(sites);
  } catch (error: any) {
    console.error("Get Pirate Sites Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const body = await req.json();
    const result = addSiteSchema.safeParse(body);

    if (!result.success) {
      return errorResponse("Validation error", 400, "VALIDATION_ERROR");
    }

    const newSite = await addPirateSite(result.data);
    return successResponse(newSite, "Pirate site added");
  } catch (error: any) {
    console.error("Add Pirate Site Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
