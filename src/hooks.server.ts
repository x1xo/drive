import Redis from 'ioredis'

import { MONGO_URI, REDIS_URI } from '$env/static/private';
import mongoose from 'mongoose';
import User from '$models/User';
import type { UserSession } from '$lib';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	if (event.url.pathname !== '/') {
        event.locals.redis = new Redis(REDIS_URI, {keyPrefix: "storage_"})
        await mongoose.connect(MONGO_URI);
        //if there is a session
        if(event.cookies.get("sid")) {
            //check if the session is valid
            const session = await event.locals.redis.get(`authsession:${event.cookies.get("sid")}`);
            if(!session) {
                if(event.url.pathname.startsWith("/dashboard")){
                    throw redirect(302, '/signin');
                }
                event.cookies.delete("sid", {path:"/"});
                return resolve(event);
            }
            //parse the session
            const parsedSession: UserSession = JSON.parse(session);
            //find the user
            const user = await User.findById(new mongoose.Types.ObjectId(parsedSession.userId));
            if(user) {
                event.locals.user = user;
            } else {
                //delete the session
                event.cookies.delete("sid", {path:"/"});
                event.locals.redis.del(`authsession:${event.cookies.get("sid")}`);
                if(event.url.pathname.startsWith("/dashboard")) 
                throw redirect(302, '/signin');
            }
        }
	}

	return resolve(event);
}