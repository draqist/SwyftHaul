// The client you created from the Server-Side Auth instructions
import { createClient } from "@/lib/supabase/server";
import { handleOAuthUserData } from "@/lib/supabase/server-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Handle user data insertion for OAuth users
      console.log("Processing OAuth user:", data.user.email);
      const { success, error: userError } = await handleOAuthUserData(
        supabase,
        data.user
      );

      console.log("User data insertion success:", success);
      if (!success) {
        console.error("Error handling OAuth user data:", userError);
        // Continue with redirect even if user data insertion fails
      } else {
        console.log("User data successfully processed for:", data.user.email);
      }

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
