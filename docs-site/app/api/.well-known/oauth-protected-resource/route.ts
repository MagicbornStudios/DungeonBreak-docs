import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

const authServerUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

const metadataHandler = protectedResourceHandler({
  authServerUrls: authServerUrl ? [authServerUrl] : ["https://dungeonbreak.dev"],
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = metadataHandler;
export const OPTIONS = metadataCorsOptionsRequestHandler();
