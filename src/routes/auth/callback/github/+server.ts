import { randomId, type UserSession } from "$lib";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$env/static/private";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import User from "$models/User";
import mongoose from "mongoose";

interface GithubResponse {
    login: string,
    id: number,
    email: string,
    avatar_url: string
}

export const GET: RequestHandler = async ({url, locals, getClientAddress, request, cookies}) => {
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

    let exchange = await getGithubAccessToken(code).catch(err => console.error("Error while exchanging github token: ", err));
    if(!exchange) {
        throw redirect(302, '/signin');
    }

    let githubUser = await getGithubUser(exchange.access_token).catch(err => console.error("Error while fetching github user: ", err));
    if(!githubUser) {
        throw redirect(302, '/signin');
    }
    
    let user  = await User.findOneAndUpdate({ email: githubUser.email }, {
        $set: {
            github: {
                id: githubUser.id,
                username: githubUser.login,
                avatarURL: githubUser.avatar_url,
            }
        }
    }, {new: true});
    if(!user){
        user = new User({
            _id: new mongoose.Types.ObjectId(),
            email: githubUser.email,
            username: githubUser.login,
            avatarURL: githubUser.avatar_url,
            github: {
                id: githubUser.id,
                username: githubUser.login,
                avatarURL: githubUser.avatar_url,
            }
        })

        await user.save();
    }

    const sessionId = randomId(32);
    const session: UserSession = {
        userId: user._id.toHexString(),
        ipAddress: getClientAddress(),
        userAgent: request.headers.get('user-agent') || '',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    };

    let response = await locals.redis.set(`authsession:${sessionId}`, JSON.stringify(session), 'EX', 60 * 60 * 24 * 30);
    if(!response) {
        console.error("Error while setting session in redis for user in github callback: ", user.id);
        throw redirect(302, '/signin');
    }

    cookies.set('sid', sessionId, { path: '/', expires: session.expiresAt, httpOnly: true, sameSite: 'strict', secure: true });

    throw redirect(302, redirectUrl);
};

interface GithubExcangeTokenResponse {
    access_token: string,
    token_type: string,
    scope: string,
    error?: string
}

async function getGithubAccessToken(code: string): Promise<GithubExcangeTokenResponse> {
    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
    })

    const response = await fetch('https://github.com/login/oauth/access_token', {
        body: params,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
    })

    if(!response.ok) {
        throw new Error(response.statusText);
    }

    const data: GithubExcangeTokenResponse = await response.json();
    if(data.error){
        throw new Error(data.error);
    }
    
    return data;
}

async function getGithubUser(access_token: string): Promise<GithubResponse> {
    const response = await fetch('https://api.github.com/user', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`
        }
    })

    if(!response.ok || response.status > 399) {
        throw new Error(`${response.statusText}`);
    }

    const data: GithubResponse = await response.json();
    if(!data) {
        throw new Error(`no data returned`);
    }

    const email = await getUserEmail(access_token);
    if(!email) {
        throw new Error("email not found");
    }

    data.email = email;

    return data;
}

interface GithubUserEmail {
    email: string,
    verified: boolean,
    primary: boolean,
    visibility: string
}
async function getUserEmail(access_token: string): Promise<string | undefined> {
    const response = await fetch('https://api.github.com/user/emails', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`
        }
    })

    if(!response.ok) {
        throw new Error(`Error while fetching user email from github response not ok: ${response.statusText}`);
    }

    const data: GithubUserEmail[] = await response.json();
    for(let email of data) {
        if(email.primary && email.verified) {
            return email.email;
        }
    }
    return;
}