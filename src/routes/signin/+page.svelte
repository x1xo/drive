<script>
    import Icon from "@iconify/svelte"
</script>
<main class="flex items-center justify-center w-full h-screen relative">
    <a class="hidden sm:block sm:absolute bottom-5 left-5 text-xs z-20" href="https://www.freepik.com/free-vector/topographic-contour-lines-map-seamless-pattern_13381541.htm#fromView=search&page=1&position=3&uuid=6e1233cf-37e0-429a-bfd2-089d7b348db2">Image by macrovector on Freepik</a>
    <div class="absolute top-0 left-0 w-full h-screen md:w-1/2 md:h-full md:border-r border-neutral-700 md:relative overflow-hidden">
        <img class="hidden dark:block object-cover w-full h-full" src="/auth-login-dark.svg" alt="Topographic contour lines map seamless pattern.">
        <img class="dark:hidden object-cover w-full h-full" src="/auth-login.svg" alt="Topographic contour lines map seamless pattern.">
    </div>
    <div class="w-max sm:w-1/2 h-full flex flex-col items-center justify-center z-10 darkbg-neutral-900 p-10">
        <h1 class="text-xl sm:text-2xl md:text-4xl whitespace-nowrap">Login to <b>Drive</b></h1>
        <div class="w-full sm:w-4/5 lg:w-2/5 flex flex-col gap-2 mt-10">
            <a href="/auth/signin?provider=google" class="btn w-full flex item-center justify-center gap-2 whitespace-nowrap">
                <Icon icon="mdi:google" class="w-7 h-7"/>
                Sign in with Google
            </a>
            <a href="/auth/signin?provider=discord" class="btn w-full flex item-center justify-center gap-2 whitespace-nowrap">
                <Icon icon="mdi:discord" class="w-7 h-7"/>
                Sign in with Discord
            </a>
            <a href="/auth/signin?provider=github" class="btn w-full flex item-center justify-center gap-2 whitespace-nowrap">
                <Icon icon="mdi:github" class="w-7 h-7"/>
                Sign in with Github
            </a>
        </div>
    </div>
</main>

<style>
    a.btn {@apply p-2 rounded-lg border dark:border-neutral-700}
</style>