"""
Tripzy.travel Master Platform Concept & Whitepaper PDF Generator
Compiles the comprehensive platform whitepaper into an executive-grade PDF publication using ReportLab.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Preformatted
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' on all pages.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header
        self.drawString(54, 792 - 36, "Tripzy.travel — Master Platform Concept & Global Architecture Whitepaper")
        self.drawRightString(612 - 54, 792 - 36, "Confidential • Executive Whitepaper")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 792 - 42, 612 - 54, 792 - 42)

        # Footer
        self.line(54, 48, 612 - 54, 48)
        self.drawString(54, 36, "Tripzy Platform • Autonomous AI, Viral Social Mechanics & Monetization Flywheel")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_str)

        self.restoreState()


def create_whitepaper_pdf(output_paths):
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=colors.HexColor("#0f172a")
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16.5,
        textColor=colors.HexColor("#475569")
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0284c7"),
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3.5
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # ==========================================
    # COVER PAGE
    # ==========================================
    story.append(Spacer(1, 30))
    badge_data = [[
        Paragraph("<font color='#0284c7'><b>TRIPZY.TRAVEL</b></font>  |  <font color='#64748b'>MASTER PLATFORM CONCEPT & WHITEPAPER</font>", body_style)
    ]]
    badge_table = Table(badge_data, colWidths=[504])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bae6fd")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph("Tripzy.travel: Autonomous Agentic Travel Recommendation & Viral Discount Engine", title_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("A comprehensive whitepaper detailing the core platform vision, cold-start recommendation algorithm, 3-layer architecture, frictionless hotel barter model, Google AdMob rewarded ads, and viral Instagram Flash Lotteries scaling to 100,000+ MAU.", subtitle_style))
    story.append(Spacer(1, 18))

    meta_data = [
        [Paragraph("<b>Document Version:</b>", body_style), Paragraph("3.0.0 (Master Whitepaper)", body_style),
         Paragraph("<b>Target Market:</b>", body_style), Paragraph("Turkey Launch & Global Expansion", body_style)],
        [Paragraph("<b>Core Problem Solved:</b>", body_style), Paragraph("Cold-Start & High Travel CAC ($0 CAC)", body_style),
         Paragraph("<b>Social Hub:</b>", body_style), Paragraph("@tripzydeal (Instagram)", body_style)],
        [Paragraph("<b>Tech Stack:</b>", body_style), Paragraph("Next.js, FastAPI, Supabase, pgvector", body_style),
         Paragraph("<b>Infrastructure Cost:</b>", body_style), Paragraph("&lt; $400 / mo (&gt;90% Net Margin)", body_style)],
        [Paragraph("<b>Scale Target:</b>", body_style), Paragraph("100,000+ Monthly Active Users", body_style),
         Paragraph("<b>Regulatory Class:</b>", body_style), Paragraph("MPİ Loyalty & KVKK Compliant", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[105, 147, 105, 147])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 18))

    # Executive Overview
    overview_box = [
        [Paragraph("<font color='#0369a1'><b>EXECUTIVE OVERVIEW & PLATFORM THESIS</b></font>", h2_style)],
        [Paragraph(
            "<b>Tripzy.travel</b> is a next-generation travel discount platform engineered to overcome the two largest hurdles in travel tech: "
            "(1) the <b>Cold-Start Problem</b> (the inability of algorithms to personalize for users with zero booking history), and "
            "(2) <b>Extorbitant Paid Ad Acquisition Costs</b>.<br/><br/>"
            "By capturing high-frequency lifestyle micro-signals (Instagram Stories, double-taps, daily streaks, geofenced proximity) and projecting "
            "them into a 32-dimensional latent vector space, Tripzy provides instant personalization for brand-new users. "
            "Furthermore, Tripzy turns hotel off-peak barter inventory into viral Instagram Flash Lotteries, acquiring tens of thousands of users at zero cash CAC "
            "and monetizing non-winners through automated 48-hour consolation vouchers, Google Rewarded Ads, and VIP subscriptions.",
            body_style
        )]
    ]
    o_table = Table(overview_box, colWidths=[504])
    o_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdf4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#86efac")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(o_table)

    story.append(PageBreak())

    # ==========================================
    # SECTION 1 & 2: PROBLEM & 3-LAYER ARCHITECTURE
    # ==========================================
    story.append(Paragraph("1. THE INDUSTRY PROBLEM & 3-LAYER ARCHITECTURE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10))

    story.append(Paragraph("1.1 The Travel Cold-Start & High CAC Dilemma", h2_style))
    story.append(Paragraph(
        "Consumers purchase travel only 1–2 times per year, causing user-item interaction matrices to be over 99.9% empty. "
        "Standard travel apps show generic static lists and spend $30–$120 on ads to acquire a single booking. "
        "Meanwhile, boutique hotels and resorts face perishable unsold room inventory that produces zero revenue.",
        body_style
    ))

    story.append(Paragraph("1.2 The Tripzy 3-Layer Solution", h2_style))
    
    arch_data = [
        [Paragraph("Architectural Layer", table_header), Paragraph("Key Technologies", table_header), Paragraph("Core Function & Responsibility", table_header)],
        [
            Paragraph("<b>Layer 1: Interface & Signal Ingestion</b>", table_cell),
            Paragraph("Next.js PWA / React Native, Tailwind CSS, LocalStorage", table_cell),
            Paragraph("Captures implicit & explicit micro-actions (double-taps, story dwell time, scratch card reveals, geofence watch). Buffers telemetry.", table_cell)
        ],
        [
            Paragraph("<b>Layer 2: Autonomous Reasoning Brain</b>", table_cell),
            Paragraph("FastAPI (Python), Google Gemini LLMs, Pydantic, SVD++", table_cell),
            Paragraph("Cross-Domain Lifestyle Projection (translates daily coffee/dining habits into travel preferences), SGD matrix factorization, provably fair draws.", table_cell)
        ],
        [
            Paragraph("<b>Layer 3: Data & Infrastructure</b>", table_cell),
            Paragraph("Supabase PostgreSQL, pgvector, Edge Caching", table_cell),
            Paragraph("32-dim vector cosine similarity search, relational profiles/tickets, row-level security, offline sync guarantees.", table_cell)
        ]
    ]
    arch_table = Table(arch_data, colWidths=[130, 150, 224])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.3 Algorithmic Cold-Start Math", h2_style))
    story.append(Paragraph(
        "For new users ($I_u = \\emptyset$), Tripzy computes a synthetic lifestyle context vector from active signals: "
        "<code>C_u = \\sum_{s \\in S_u} w_s \\cdot \\vec{E}(s)</code>. The final ranking blends lifestyle projection and SVD++ ratings via an adaptive parameter: "
        "<code>Score = (1 - \\alpha) \\cdot \\text{LifestyleProjection} + \\alpha \\cdot \\text{SVD++}</code>, scaling smoothly from $\\alpha=0$ (pure cold start) to $\\alpha=0.80$ (warm users).",
        body_style
    ))

    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 2: CONSUMER FEATURES & VIRAL LOTTERY
    # ==========================================
    story.append(Paragraph("2. CONSUMER EXPERIENCE & THE VIRAL FLASH LOTTERY", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10))

    feat_data = [
        [Paragraph("Feature Component", table_header), Paragraph("User Micro-Action", table_header), Paragraph("Platform Value & Signal Captured", table_header)],
        [
            Paragraph("<b>Instagram Stories Bar</b>", table_cell),
            Paragraph("5-second auto-advancing slides with glowing gradient rings.", table_cell),
            Paragraph("Dwell-time tracking feeds category interest vector; direct 'Claim Deal' CTA.", table_cell)
        ],
        [
            Paragraph("<b>Double-Tap Heart Burst</b>", table_cell),
            Paragraph("Double-tapping deal card spawns particle hearts + haptics.", table_cell),
            Paragraph("Wishlist save, +10 XP reward, instant category affinity boost in latent space.", table_cell)
        ],
        [
            Paragraph("<b>Daily Exploration Streak</b>", table_cell),
            Paragraph("Consecutive login tracking (🔥 3 Günlük Seri!).", table_cell),
            Paragraph("Awards daily XP & coins, unlocking interactive mystery scratch cards.", table_cell)
        ],
        [
            Paragraph("<b>Interactive Scratch Cards</b>", table_cell),
            Paragraph("HTML5 Canvas scratch-off foil revealing hidden discounts.", table_cell),
            Paragraph("Tests price sensitivity and delivers impulse discount conversions at 45% clear.", table_cell)
        ],
        [
            Paragraph("<b>Digital Travel Passport</b>", table_cell),
            Paragraph("City stamps (Istanbul, Cappadocia, Antalya, Bodrum).", table_cell),
            Paragraph("Gamifies travel tier progression (*Çaylak Gezgin* → *Seyahat Efsanesi*).", table_cell)
        ],
        [
            Paragraph("<b>Flash Lottery Engine</b>", table_cell),
            Paragraph("Share 9:16 Story tagging <b>@tripzydeal</b> or watch video ad.", table_cell),
            Paragraph("Mints free lottery tickets; SHA-256 provably fair winner draw; non-winners get 25% off.", table_cell)
        ]
    ]
    f_table = Table(feat_data, colWidths=[130, 184, 190])
    f_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(f_table)

    story.append(PageBreak())

    # ==========================================
    # SECTION 3: BUSINESS MODEL & MONETIZATION
    # ==========================================
    story.append(Paragraph("3. MASTER BUSINESS MODEL & 7 REVENUE PILLARS", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10))

    story.append(Paragraph("3.1 The Seven Diversified Revenue Engines", h2_style))
    
    rev_data = [
        [Paragraph("Pillar", table_header), Paragraph("Revenue Stream", table_header), Paragraph("Mechanism & Economics", table_header), Paragraph("Target (100k MAU)", table_header)],
        [Paragraph("1", table_cell), Paragraph("<b>Booking Commissions</b>", table_cell), Paragraph("8% - 15% marketplace commission on completed hotel stays, dining vouchers, yacht charters.", table_cell), Paragraph("₺320,000 / mo", table_cell)],
        [Paragraph("2", table_cell), Paragraph("<b>Consolation Vouchers</b>", table_cell), Paragraph("Automated 25% off 48-hour flash vouchers given to all non-winners (3% conversion rate).", table_cell), Paragraph("₺190,000 / mo", table_cell)],
        [Paragraph("3", table_cell), Paragraph("<b>Google Rewarded Ads</b>", table_cell), Paragraph("Opt-in video ads (+1 ticket). Turkish eCPM: $2.50-$6.00; Tourist/Expat eCPM: $15-$35.", table_cell), Paragraph("₺300,000 / mo", table_cell)],
        [Paragraph("4", table_cell), Paragraph("<b>Tripzy VIP (MRR)</b>", table_cell), Paragraph("₺99/month or ₺799/year. 3x-5x lottery odds, 100% ad-free experience, zero booking fees.", table_cell), Paragraph("₺150,000 / mo", table_cell)],
        [Paragraph("5", table_cell), Paragraph("<b>Merchant Featured Drops</b>", table_cell), Paragraph("Phase 1: Free barter → Phase 3: ₺2,500-₺5,000 upfront fee for guaranteed 5k+ story shares.", table_cell), Paragraph("₺95,000 / mo", table_cell)],
        [Paragraph("6", table_cell), Paragraph("<b>Owned Media Channels</b>", table_cell), Paragraph("Sponsored deal drops and affiliate links across Telegram, WhatsApp, Instagram (@tripzydeal).", table_cell), Paragraph("₺90,000 / mo", table_cell)],
        [Paragraph("7", table_cell), Paragraph("<b>Creator Rev-Share</b>", table_cell), Paragraph("Influencer giveaway co-branding with performance rev-share on referred bookings.", table_cell), Paragraph("Performance", table_cell)]
    ]
    r_table = Table(rev_data, colWidths=[20, 110, 264, 110])
    r_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(r_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("3.2 Financial Projections Across Growth Stages", h2_style))
    
    fin_data = [
        [Paragraph("Financial Metric", table_header), Paragraph("10,000 MAU (Launch)", table_header), Paragraph("50,000 MAU (Traction)", table_header), Paragraph("100,000 MAU (Scale)", table_header)],
        [Paragraph("Total Projected Monthly Revenue", table_cell), Paragraph("₺107,500", table_cell), Paragraph("₺445,000", table_cell), Paragraph("<b>₺1,145,000 (~$34k/mo)</b>", table_cell)],
        [Paragraph("Estimated Fixed Cloud/DB Cost", table_cell), Paragraph("~₺8,500 ($250)", table_cell), Paragraph("~₺11,500 ($340)", table_cell), Paragraph("~₺13,500 ($400)", table_cell)],
        [Paragraph("<b>Net Operating Margin %</b>", table_cell), Paragraph("<b>~92.0%</b>", table_cell), Paragraph("<b>~97.4%</b>", table_cell), Paragraph("<b>~98.8%</b>", table_cell)]
    ]
    fin_table = Table(fin_data, colWidths=[150, 118, 118, 118])
    fin_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(fin_table)

    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 4: GOVERNANCE & COMPLIANCE
    # ==========================================
    story.append(Paragraph("4. OPERATIONAL GOVERNANCE & REGULATORY COMPLIANCE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10))

    story.append(Paragraph(
        "• <b>Admin Panel 360° Control (<code>/admin</code>):</b> Complete management over deals, categories, users, subscriptions, 9:16 stories, flash lotteries, social raffles, fraud signals, and ticket audits.<br/>"
        "• <b>Milli Piyango İdaresi (MPİ) Exemption:</b> Lotteries operate strictly as free commercial loyalty promotions (*Promosyon ve Ticari Sadakat Kampanyası*), exempt from gambling licensing taxes.<br/>"
        "• <b>KVKK Compliance:</b> User notification and location tracking consents are stored with cryptographic audit timestamps in Supabase.",
        body_style
    ))

    # Build PDF
    for path in output_paths:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        doc = SimpleDocTemplate(
            path,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )
        doc.build(story, canvasmaker=NumberedCanvas)
        print(f"Successfully generated Master Whitepaper PDF: {path}")

if __name__ == '__main__':
    workspace_pdf = r"c:\Users\elif\Documents\antigravity\happy-hopper\docs\TRIPZY_MASTER_PLATFORM_CONCEPT_AND_WHITE_PAPER.pdf"
    artifact_pdf = r"C:\Users\elif\.gemini\antigravity\brain\32665860-31cb-43ce-86fe-a33f66a25bdc\tripzy_master_platform_whitepaper.pdf"
    create_whitepaper_pdf([workspace_pdf, artifact_pdf])
