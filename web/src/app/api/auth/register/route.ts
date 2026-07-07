import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { registerUser } from "@/features/auth/authService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newUser = await registerUser(body);
    return successResponse(newUser, "User created successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}
