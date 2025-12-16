import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface WalletQRCodeProps {
    walletItemId: string;
    redemptionCode: string;
    dealTitle?: string;
    size?: number;
}

/**
 * Displays a QR code for a wallet item that can be scanned by vendors.
 * The QR encodes: { "wi": walletItemId, "rc": redemptionCode }
 */
const WalletQRCode: React.FC<WalletQRCodeProps> = ({
    walletItemId,
    redemptionCode,
    dealTitle,
    size = 200
}) => {
    // Create the QR payload
    const qrPayload = JSON.stringify({
        wi: walletItemId,
        rc: redemptionCode
    });

    return (
        <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-lg">
            {/* QR Code */}
            <div className="p-4 bg-white rounded-xl border-2 border-gray-100">
                <QRCodeSVG
                    value={qrPayload}
                    size={size}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                />
            </div>

            {/* Redemption Code Display */}
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Your Redemption Code</p>
                <p className="text-3xl font-bold tracking-widest text-gray-900">
                    {redemptionCode}
                </p>
            </div>

            {/* Deal Title */}
            {dealTitle && (
                <p className="mt-3 text-sm text-gray-600 text-center max-w-xs">
                    {dealTitle}
                </p>
            )}

            {/* Instructions */}
            <p className="mt-4 text-xs text-gray-400 text-center max-w-xs">
                Show this QR code to the vendor, or give them the code above
            </p>
        </div>
    );
};

export default WalletQRCode;
