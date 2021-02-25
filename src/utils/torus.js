
export async function getDirectWebSdk() {
    const { default: DirectWebSdk } = await import("@toruslabs/torus-direct-web-sdk");
    return new DirectWebSdk({
        baseUrl: location.origin,
        redirectPathName: "torus-support",
        enableLogging: true,
        uxMode: "redirect",
        network: "testnet"
    });
}