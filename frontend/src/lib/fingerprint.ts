export const getDeviceFingerprint = async (): Promise<string> => {
    try {
        const components: string[] = [];

        // 1. Basic Navigator Info
        components.push(navigator.userAgent);
        components.push(navigator.language);
        components.push(String(navigator.hardwareConcurrency || 'unknown'));
        components.push(String((navigator as any).deviceMemory || 'unknown'));

        // 2. Screen Info
        components.push(String(window.screen.colorDepth));
        components.push(String(window.screen.width));
        components.push(String(window.screen.height));

        // 3. Timezone Info
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

        // 4. Canvas Fingerprint
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Egg Game FP, 😋', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Egg Game FP, 😋', 4, 17);
            components.push(canvas.toDataURL());
        }

        // Hash the fingerprint
        const fingerprintString = components.join('###');
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return hashHex;
    } catch (error) {
        console.error('Error generating fingerprint:', error);
        return 'fallback-fingerprint-error';
    }
};
