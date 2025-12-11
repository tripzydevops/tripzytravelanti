import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaHeadProps {
    title: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
}

const MetaHead: React.FC<MetaHeadProps> = ({
    title,
    description = "Save on travel, hotels, and flights with Tripzy subscriptions.",
    image = "https://tripzy.app/og-image.jpg", // Replace with actual default OG image
    url = "https://tripzy.app",
    type = "website"
}) => {
    const fullTitle = `${title} | Tripzy`;

    return (
        <Helmet>
            {/* Standard Metrics */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />
        </Helmet>
    );
};

export default MetaHead;
