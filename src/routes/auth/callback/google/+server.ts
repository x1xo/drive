import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "$env/static/private";
import { PUBLIC_URL } from "$env/static/public";
import { randomId, type UserSession } from "$lib";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import User from "$models/User";
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

    let exchange = await getGoogleAccessToken(code).catch(err => console.error("Error while exchanging google token: ", err));
    if(!exchange) {
        throw redirect(302, '/signin');
    }

    let googleUser = await getGoogleUser(exchange.access_token).catch(err => console.error("Error while fetching google user: ", err));
    if(!googleUser) {
        throw redirect(302, '/signin');
    }

    let user  = await User.findOne({ email: googleUser.email });
    if(!user) {
        user = new User({
            _id: new mongoose.Types.ObjectId(),
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture
        });
        await user.save();
    }

    const sessionId = randomId(32);
    const session: UserSession = {
        userId: user._id.toHexString(),
        ipAddress: getClientAddress(),
        userAgent: request.headers.get('user-agent') || '',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    let response = await locals.redis.set(`authsession:${sessionId}`, getClientAddress(), 'EX', 10 * 60);
    if(!response) {
        throw redirect(302, '/signin');
    }

    cookies.set('sid', sessionId, { path: '/', expires: session.expiresAt, httpOnly: true, sameSite: 'strict', secure: true });

    throw redirect(302, redirectUrl);
};

interface GoogleExcangeTokenResponse {
    access_token: string;
    token_type: string;
    error?: string;
}

async function getGoogleAccessToken(code: string): Promise<GoogleExcangeTokenResponse> {
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${PUBLIC_URL}/auth/callback/google`,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
        body: params,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
    });

    if(!response.ok) {
        throw new Error(`${response.statusText}`);
    }

    const data: GoogleExcangeTokenResponse = await response.json();
    if(data.error) {
        throw new Error(`${data.error}`);
    }

    return data;
}

interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

async function getGoogleUser(access_token: string): Promise<GoogleUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`
        }
    });

    if(!response.ok) {
        throw new Error(response.statusText);
    }

    const data: GoogleUser = await response.json();
    if(!data) {
        throw new Error('no data returned');
    }

    return data;
}
