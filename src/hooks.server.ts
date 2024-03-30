import Redis from 'ioredis'
import { MONGO_URI, REDIS_URI } from '$env/static/private';
import mongoose from 'mongoose';
import User from '$models/User';
import type { UserSession } from '$lib';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
        event.locals.redis = new Redis(REDIS_URI, { keyPrefix: "storage_" })
        await mongoose.connect(MONGO_URI)

        if (event.url.pathname.startsWith("/auth")) {
            return resolve(event);
        }

        if (event.url.pathname.startsWith("/dashboard") || event.url.pathname.startsWith("/api")) {
            event.locals.user = await authenticateUser(event.cookies.get("sid"), event.locals.redis);
            if(!event.locals.user) {
                if(event.cookies.get("sid")) {
                    event.cookies.delete("sid", {path:"/"});
                }
                throw redirect(302, "/auth/signin");
            }
        }
        
    return resolve(event);
}

async function authenticateUser(sid: string|undefined, redis: Redis) {
    const session = await redis.get(`authsession:${sid}`);
    if (!session) return null;

    const parsedSession: UserSession = JSON.parse(session);
    const user = await User.findById(new mongoose.Types.ObjectId(parsedSession.userId));
    if(!user) {
        await redis.del(`authsession:${sid}`);
        return null;
    }

    return user;
}