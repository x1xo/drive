import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from "$env/static/private";
import { PUBLIC_URL } from "$env/static/public";
import { randomId, type UserSession } from "$lib";
import User from "$models/User";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import mongoose from "mongoose";

export const GET: RequestHandler = async ({url, locals, request, getClientAddress, cookies}) => {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if(!code || !state) {
        throw redirect(302, '/signin');
    }

    let redirectUrl = await locals.redis.getdel(`authstate:${state}`);
    if(!redirectUrl) {
        console.error("Invalid state");
        throw redirect(302, '/signin');
    }

    let exchange = await getDiscordAccessToken(code).catch(err => console.error("Error while exchanging discord token: ", err));
    if(!exchange) {
        throw redirect(302, '/signin');
    }

    let discordUser = await getDiscordUser(exchange.access_token).catch(err => console.error("Error while fetching discord user: ", err));
    if(!discordUser) {
        throw redirect(302, '/signin');
    }

    let user  = await User.findOne({ email: discordUser.email });
    if(!user) {
        user = new User({
            _id: new mongoose.Types.ObjectId(),
            email: discordUser.email,
            name: discordUser.username,
            avatar: discordUser.avatar
        });
        await user.save();
    }

    const sessionId = randomId(32);
    let session: UserSession = {
        userId: user._id.toHexString(),
        ipAddress: getClientAddress(),
        userAgent: request.headers.get('user-agent') || '',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }

    let response = await locals.redis.set(`authsession:${sessionId}`, JSON.stringify(session), "EX", 30 * 24 * 60 * 60);
    if(!response) {
        console.error("Error while setting session in redis for user in discord callback: ", user.id);
        throw redirect(302, '/signin');
    }

    cookies.set('sid', sessionId, {path: '/', expires: session.expiresAt, httpOnly: true, sameSite: 'strict', secure: true});

    return new Response();
};

interface DiscordExcangeTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    error?: string;
}

async function getDiscordAccessToken(code: string): Promise<DiscordExcangeTokenResponse> {
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${PUBLIC_URL}/auth/callback/discord`,       
    });

    const response = await fetch('https://discord.com/api/oauth2/token', {
        body: params,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
    });

    if(!response.ok) {
        throw new Error(response.statusText);
    }

    const data: DiscordExcangeTokenResponse = await response.json();
    if(data.error) {
        throw new Error(data.error);
    }

    return data;
}

interface DiscordUser {
    id: string;
    username: string;
    avatar: string;
    email: string;
}

async function getDiscordUser(access_token: string): Promise<DiscordUser> {
    const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`
        }
    });

    if(!response.ok) {
        throw new Error(`${response.statusText}`);
    }

    const data: DiscordUser = await response.json();
    if(!data) {
        throw new Error(`no data returned`);
    }

    data.avatar = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`;

    return data;
}

