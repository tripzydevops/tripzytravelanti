import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (errorMessage: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize scanner
        // We use a timeout to ensure the DOM element is ready
        const timeoutId = setTimeout(() => {
            if (!scannerRef.current) {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
                );

                scanner.render(
                    (decodedText) => {
                        onScan(decodedText);
                        // Optional: Stop scanning after successful scan
                        // scanner.clear(); 
                    },
                    (errorMessage) => {
                        // QR Code no longer in front of camera
                        // We can ignore this or handle it
                        if (onError) onError(errorMessage);
                    }
                );
                scannerRef.current = scanner;
            }
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(error => {
                        console.error("Failed to clear html5-qrcode scanner. ", error);
                    });
                } catch (e) {
                    console.error("Error clearing scanner", e);
                }
            }
        };
    }, [onScan, onError]);

    return (
        <div className="w-full max-w-md mx-auto">
            <div id="reader" className="w-full"></div>
            {scanError && <p className="text-red-500 text-center mt-2">{scanError}</p>}
        </div>
    );
};

export default QRScanner;
