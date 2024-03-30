import { DISCORD_CLIENT_ID, GITHUB_CLIENT_ID, GOOGLE_CLIENT_ID } from "$env/static/private";
import { PUBLIC_URL } from "$env/static/public";
import { redirect, type RequestHandler } from "@sveltejs/kit";

const providers = ["github", "google", "discord"];
const providerUrls = {
    "github": `https://github.com/login/oauth/authorize?scope=<scope>&redirect_uri=<redirect_uri>&client_id=<client_id>&state=<state>`,
    "google": `https://accounts.google.com/o/oauth2/v2/auth?scope=<scope>&redirect_uri=<redirect_uri>&response_type=code&client_id=<client_id>&state=<state>`,
    "discord": `https://discord.com/api/oauth2/authorize?scope=<scope>&redirect_uri=<redirect_uri>&response_type=code&client_id=<client_id>&state=<state>`,
}
export const GET: RequestHandler = async ({url, locals}) => {
    const provider = url.searchParams.get('provider');
    const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
    if(!provider || !providers.includes(provider)) {
        throw redirect(302, '/signup')
    }

    let id = crypto.randomUUID()
    let response = await locals.redis.set(`authstate:${id}`, redirectTo, 'EX', 10 * 60);
    
    if(!response) {
        throw redirect(302, '/signup')
    }

    let uri = getRedirectURI(provider);
    uri = uri.replace('<state>', id);

    throw redirect(302, uri);
};

function getRedirectURI(provider: string) {
    let uri:string = providerUrls[provider as keyof typeof providerUrls];
    switch(provider){
        case "github":
            uri = uri
                .replace('<scope>', 'user%20user:email')
                .replace('<redirect_uri>', `${PUBLIC_URL}/auth/callback/github`)
                .replace('<client_id>', GITHUB_CLIENT_ID);
            break
        case "google":
            uri = uri
                .replace('<scope>', 'profile%20email')
                .replace('<redirect_uri>', `${PUBLIC_URL}/auth/callback/google`)
                .replace('<client_id>', GOOGLE_CLIENT_ID);
            break
        case "discord":
            uri = uri
                .replace('<scope>', 'identify%20email')
                .replace('<redirect_uri>', `${PUBLIC_URL}/auth/callback/discord`)
                .replace('<client_id>', DISCORD_CLIENT_ID);
            break
        default:
            throw redirect(302, '/signup')
    }

    return uri;
}