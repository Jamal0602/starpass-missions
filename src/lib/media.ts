import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Uploads an image to the private media bucket under the user's folder; returns the storage path. */
export async function uploadImage(file: File): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error("Use a JPG, PNG, WEBP or GIF image");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in first");
  const ext = (file.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Upload failed");
  return path;
}

/** Resolves a stored media path (or plain https URL) into a viewable URL. */
export function useMediaUrl(path: string | null | undefined) {
  const isPath = !!path && !/^(https?:\/\/|\/)/.test(path);
  const q = useQuery({
    queryKey: ["media", path],
    enabled: isPath,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("media").createSignedUrl(path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
  return isPath ? (q.data ?? null) : (path ?? null);
}
