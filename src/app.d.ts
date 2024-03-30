import { type Redis } from 'ioredis'
import User from '$models/User';
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			redis: Redis
			user?: User
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
