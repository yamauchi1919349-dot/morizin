import {
  getFacilitySettingsForFacility,
  updateFacilitySettingsForFacility,
  validateFacilitySettingsBody,
} from "@/lib/supabase/facilitySettings";
import { readJsonObject, requireActiveProfile, staffErrorResponse } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { admin, profile } = await requireActiveProfile(request);
    const response = await getFacilitySettingsForFacility(admin, profile.facility_id);
    return Response.json(response);
  } catch (error) {
    return staffErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { admin, profile } = await requireActiveProfile(request, true);
    const body = await readJsonObject(request);
    const settings = validateFacilitySettingsBody(body);
    const response = await updateFacilitySettingsForFacility(admin, profile.facility_id, settings);
    return Response.json(response);
  } catch (error) {
    return staffErrorResponse(error);
  }
}
