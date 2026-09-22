"""
Tripzy.travel Architecture & Monetization Master PDF Generator
Compiles the 4 core architecture and business markdown files into a unified,
executive-grade PDF publication using ReportLab.
"""

import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
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
            # Skip header and footer on the cover page
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header
        self.drawString(54, 792 - 36, "Tripzy.travel — Master Architecture & Monetization Blueprint")
        self.drawRightString(612 - 54, 792 - 36, "Confidential • Internal Strategy")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 792 - 42, 612 - 54, 792 - 42)

        # Footer
        self.line(54, 48, 612 - 54, 48)
        self.drawString(54, 36, "Tripzy Platform • 3-Layer Architecture (AI, Viral Social & Monetization)")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_str)

        self.restoreState()


def create_master_pdf(output_paths):
    # Palette
    c_primary = colors.HexColor("#0f172a")    # Slate 900
    c_brand = colors.HexColor("#0284c7")      # Sky 600
    c_accent = colors.HexColor("#f59e0b")     # Amber 500
    c_emerald = colors.HexColor("#059669")    # Emerald 600
    c_rose = colors.HexColor("#e11d48")       # Rose 600
    c_dark = colors.HexColor("#1e293b")       # Slate 800
    c_muted = colors.HexColor("#64748b")      # Slate 500
    c_bg_light = colors.HexColor("#f8fafc")   # Slate 50
    c_border = colors.HexColor("#cbd5e1")     # Slate 300

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#0f172a"),
        alignment=0
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#475569"),
        alignment=0
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0369a1"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'Header3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b")
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

    story = []

    # ==========================================
    # COVER PAGE
    # ==========================================
    story.append(Spacer(1, 40))
    # Brand Badge
    badge_data = [[
        Paragraph("<font color='#0284c7'><b>TRIPZY.TRAVEL</b></font>  |  <font color='#64748b'>MASTER ARCHITECTURE BLUEPRINT</font>", body_style)
    ]]
    badge_table = Table(badge_data, colWidths=[504])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bae6fd")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 20))

    story.append(Paragraph("Unified Growth, Gamification & Monetization Engine", title_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("A comprehensive technical and financial blueprint covering viral flash lotteries, Instagram AI vision OCR verification, Google AdMob rewarded ads, gamified passport loops, and high-margin unit economics scaling to 100,000+ MAU.", subtitle_style))
    story.append(Spacer(1, 25))

    # Metadata Grid Box
    meta_data = [
        [Paragraph("<b>Target Market:</b>", body_style), Paragraph("Turkey Launch & Global Expansion", body_style),
         Paragraph("<b>Scale Target:</b>", body_style), Paragraph("100,000+ MAU ($0 CAC)", body_style)],
        [Paragraph("<b>Architecture:</b>", body_style), Paragraph("3-Layer Autonomous Engine", body_style),
         Paragraph("<b>Instagram Handle:</b>", body_style), Paragraph("@tripzydeal", body_style)],
        [Paragraph("<b>Database:</b>", body_style), Paragraph("Supabase PostgreSQL + pgvector", body_style),
         Paragraph("<b>Fixed Cloud Cost:</b>", body_style), Paragraph("&lt; $400 / month (&gt;90% Margin)", body_style)],
        [Paragraph("<b>Document Version:</b>", body_style), Paragraph("2.0.0 (Consolidated Master)", body_style),
         Paragraph("<b>Status:</b>", body_style), Paragraph("<font color='#059669'><b>Active Production Ready</b></font>", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[100, 152, 100, 152])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 25))

    # Executive Overview Box
    exec_content = [
        [Paragraph("<font color='#0369a1'><b>EXECUTIVE OVERVIEW & PLATFORM THESIS</b></font>", h3_style)],
        [Paragraph(
            "Tripzy solves the cold-start recommendation dilemma in travel by coupling an autonomous multi-agent reasoning layer "
            "with zero-cost viral acquisition mechanics. By transforming hotel barter inventory into viral Instagram Flash Lotteries, "
            "capturing deep behavioral signals via double-taps and story interactions, and monetizing non-winners through high-converting "
            "consolation vouchers and Google Rewarded Ads, Tripzy generates self-funding, high-margin unit economics from Day 1.",
            callout_style
        )]
    ]
    exec_table = Table(exec_content, colWidths=[504])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdf4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#86efac")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(exec_table)
    
    story.append(Spacer(1, 30))
    story.append(Paragraph("<b>Consolidated Modules Included:</b>", body_style))
    story.append(Paragraph("• <b>Module 1:</b> Comprehensive Monetization Plan & Master Business Model (7 Core Revenue Pillars)", bullet_style))
    story.append(Paragraph("• <b>Module 2:</b> Flash Lottery & Instagram Share Verification Engine (Webhooks & AI Vision OCR)", bullet_style))
    story.append(Paragraph("• <b>Module 3:</b> Gamification & Social Engagement Engine (Stories, Streaks, Scratch Cards & Passport)", bullet_style))
    story.append(Paragraph("• <b>Module 4:</b> Technical Implementation Roadmap & Database Schema Reference", bullet_style))

    story.append(PageBreak())

    # ==========================================
    # MODULE 1: MONETIZATION & BUSINESS MODEL
    # ==========================================
    story.append(Paragraph("MODULE 1: MASTER MONETIZATION & BUSINESS ARCHITECTURE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))
    
    story.append(Paragraph("1.1 The Tripzy Monetization Flywheel", h2_style))
    story.append(Paragraph(
        "Tripzy operates on a closed-loop flywheel where every user interaction either generates instant revenue, builds owned audience distribution, "
        "or fuels zero-CAC viral referral loops:",
        body_style
    ))

    flywheel_box = [
        [Paragraph("<b>Step 1: Free Hotel Barter Inventory</b> → Zero-cost hotel rooms and experiential passes acquired in exchange for guaranteed viral publicity.", bullet_style)],
        [Paragraph("<b>Step 2: Viral Instagram Flash Lottery</b> → Thousands of users share 9:16 Story templates tagging <b>@tripzydeal</b> to win the stay.", bullet_style)],
        [Paragraph("<b>Step 3: Google Rewarded Video Ads</b> → Users watch 15-30s opt-in sponsor videos to mint extra lottery tickets, generating high eCPM ad revenue.", bullet_style)],
        [Paragraph("<b>Step 4: Consolation Vouchers</b> → The 99.9% non-winners automatically receive 48-hour exclusive 25% discount vouchers, driving hundreds of paid bookings.", bullet_style)],
        [Paragraph("<b>Step 5: Owned Media Distribution & MRR</b> → Continuous growth of Telegram, WhatsApp, and Instagram channels feeds paid VIP memberships.", bullet_style)]
    ]
    flywheel_table = Table(flywheel_box, colWidths=[504])
    flywheel_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(flywheel_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.2 The Seven Revenue Pillars", h2_style))
    
    # Revenue Pillars Table
    rev_table_data = [
        [Paragraph("Revenue Pillar", table_header), Paragraph("Mechanism & Pricing", table_header), Paragraph("Target Economics", table_header)],
        [
            Paragraph("<b>1. Booking Commissions</b>", table_cell),
            Paragraph("8% - 15% marketplace commission on completed hotel stays, dining vouchers, yacht charters.", table_cell),
            Paragraph("₺320,000 / mo @ 100k MAU", table_cell)
        ],
        [
            Paragraph("<b>2. Consolation Vouchers</b>", table_cell),
            Paragraph("Automated 25% off 48-hour flash vouchers given to all non-winners (3% conversion rate).", table_cell),
            Paragraph("₺190,000 / mo @ 100k MAU", table_cell)
        ],
        [
            Paragraph("<b>3. Google Rewarded Ads</b>", table_cell),
            Paragraph("Opt-in video ads (+1 ticket). Turkish eCPM: $2.50-$6.00; Tourist/Expat eCPM: $15-$35.", table_cell),
            Paragraph("₺300,000 / mo (~$9k/mo)", table_cell)
        ],
        [
            Paragraph("<b>4. Tripzy VIP Subscriptions</b>", table_cell),
            Paragraph("₺99/month or ₺799/year. 3x-5x lottery odds, ad-free experience, zero booking fees.", table_cell),
            Paragraph("₺150,000 / mo (1,500 subs)", table_cell)
        ],
        [
            Paragraph("<b>5. Merchant Featured Drops</b>", table_cell),
            Paragraph("Phase 1: Free barter → Phase 3: ₺2,500-₺5,000 upfront fee for guaranteed 5k+ story shares.", table_cell),
            Paragraph("₺95,000 / mo @ 100k MAU", table_cell)
        ],
        [
            Paragraph("<b>6. Owned Media Channels</b>", table_cell),
            Paragraph("Sponsored deal drops and affiliate links across Telegram, WhatsApp, Instagram (@tripzydeal).", table_cell),
            Paragraph("₺90,000 / mo @ 100k MAU", table_cell)
        ]
    ]
    p_table = Table(rev_table_data, colWidths=[120, 244, 140])
    p_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(p_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("1.3 Financial Modeling & Revenue Projections Across Scale", h2_style))
    
    fin_data = [
        [Paragraph("Metric / Revenue Stream", table_header), Paragraph("10,000 MAU (Launch)", table_header), Paragraph("50,000 MAU (Traction)", table_header), Paragraph("100,000 MAU (Scale)", table_header)],
        [Paragraph("Marketplace Booking Commissions", table_cell), Paragraph("₺30,000", table_cell), Paragraph("₺120,000", table_cell), Paragraph("₺320,000", table_cell)],
        [Paragraph("Consolation Voucher Conversions", table_cell), Paragraph("₺18,000", table_cell), Paragraph("₺75,000", table_cell), Paragraph("₺190,000", table_cell)],
        [Paragraph("Google Rewarded Video Ads", table_cell), Paragraph("₺35,000", table_cell), Paragraph("₺125,000", table_cell), Paragraph("₺300,000", table_cell)],
        [Paragraph("Tripzy VIP (MRR Subscriptions)", table_cell), Paragraph("₺9,500 (100 subs)", table_cell), Paragraph("₺50,000 (500 subs)", table_cell), Paragraph("₺150,000 (1,500 subs)", table_cell)],
        [Paragraph("Merchant Featured Drops / Ads", table_cell), Paragraph("₺0 (Barter Phase)", table_cell), Paragraph("₺35,000", table_cell), Paragraph("₺95,000", table_cell)],
        [Paragraph("Owned Media & Social Channels", table_cell), Paragraph("₺15,000", table_cell), Paragraph("₺40,000", table_cell), Paragraph("₺90,000", table_cell)],
        [Paragraph("<b>Total Monthly Revenue</b>", table_header), Paragraph("<b>₺107,500</b>", table_header), Paragraph("<b>₺445,000</b>", table_header), Paragraph("<b>₺1,145,000 (~$34k/mo)</b>", table_header)],
        [Paragraph("Estimated Cloud Costs", table_cell), Paragraph("~₺8,500 ($250)", table_cell), Paragraph("~₺11,500 ($340)", table_cell), Paragraph("~₺13,500 ($400)", table_cell)],
        [Paragraph("<b>Net Operating Margin</b>", table_cell), Paragraph("<b>~92%</b>", table_cell), Paragraph("<b>~97%</b>", table_cell), Paragraph("<b>~98.8%</b>", table_cell)]
    ]
    f_table = Table(fin_data, colWidths=[150, 118, 118, 118])
    f_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0369a1")),
        ('BACKGROUND', (0,7), (-1,7), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,6), [colors.white, colors.HexColor("#f8fafc")]),
        ('ROWBACKGROUNDS', (0,8), (-1,-1), [colors.white, colors.HexColor("#f0fdf4")]),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(f_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.4 Regulatory Compliance (Turkey MPİ & KVKK)", h2_style))
    story.append(Paragraph(
        "• <b>Milli Piyango İdaresi (MPİ) Exemption:</b> Lotteries are structured as commercial promotional reward programs. "
        "Because entry is 100% free via social share or rewarded ads, and prizes represent discount vouchers / free stays, they are exempt from gambling taxes.<br/>"
        "• <b>KVKK Compliance:</b> User opt-ins for phone and WhatsApp deal notifications are recorded with cryptographic timestamps in <code>public.user_consents</code>.",
        body_style
    ))

    story.append(PageBreak())

    # ==========================================
    # MODULE 2: FLASH LOTTERY & VIRAL ENGINE
    # ==========================================
    story.append(Paragraph("MODULE 2: FLASH LOTTERY & INSTAGRAM VERIFICATION ENGINE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

    story.append(Paragraph("2.1 Hybrid 3-Tier Instagram Verification Architecture", h2_style))
    story.append(Paragraph(
        "To bypass Meta API restrictions on consumer accounts while guaranteeing fast ticket minting, Tripzy deploys a hybrid verification engine:",
        body_style
    ))

    v_tier_data = [
        [Paragraph("Verification Pathway", table_header), Paragraph("Operation Flow", table_header), Paragraph("Speed & Proof", table_header)],
        [
            Paragraph("<b>Tier 1: Story Canvas & Referral Link</b>", table_cell),
            Paragraph("Generates 9:16 canvas with @tripzydeal sticker and unique referral QR code (#TRPZ-XXXXXX). Web Share API emits intent.", table_cell),
            Paragraph("Instant (&lt;500ms)<br/>Direct Ticket Mint", table_cell)
        ],
        [
            Paragraph("<b>Tier 2: AI Vision OCR Parser</b>", table_cell),
            Paragraph("User uploads story screenshot. Vision OCR parser scans image for '@tripzydeal' handle and partner tags.", table_cell),
            Paragraph("&lt;2.0 seconds<br/>Visual Hash Logged", table_cell)
        ],
        [
            Paragraph("<b>Tier 3: Loyalty Points Exchange</b>", table_cell),
            Paragraph("Users can redeem 50 Tripzy loyalty points earned through daily exploration for +1 extra lottery ticket.", table_cell),
            Paragraph("Instant<br/>Balance Debit", table_cell)
        ]
    ]
    v_table = Table(v_tier_data, colWidths=[130, 244, 130])
    v_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(v_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("2.2 Provably Fair Cryptographic Winner Selection", h2_style))
    story.append(Paragraph(
        "Draws are 100% deterministic and tamper-proof using double-layer SHA-256 hashing. Anyone can independently verify the winner:",
        body_style
    ))

    math_box = [
        [Paragraph("<b>Cryptographic Formulae:</b>", h3_style)],
        [Paragraph("<code>Draw Seed = SHA256(CampaignID + ExpirationTimestamp + ServerSalt)</code>", code_style)],
        [Paragraph("<code>Ticket Hash = SHA256(TicketNumber + Draw Seed)</code>", code_style)],
        [Paragraph("The winning ticket is selected by sorting all ticket hashes deterministically and selecting the lowest hash value. "
                   "The winner instantly receives a 100% free voucher in <code>WalletPage.tsx</code>.", callout_style)]
    ]
    m_table = Table(math_box, colWidths=[504])
    m_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(m_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2.3 FastAPI Backend Endpoints Reference", h2_style))
    
    api_data = [
        [Paragraph("Method", table_header), Paragraph("Endpoint Path", table_header), Paragraph("Description & Security", table_header)],
        [Paragraph("GET", table_cell), Paragraph("<code>/api/v1/lottery/campaigns</code>", table_cell), Paragraph("Returns active, drawn, and upcoming giveaways.", table_cell)],
        [Paragraph("POST", table_cell), Paragraph("<code>/api/v1/lottery/campaigns</code>", table_cell), Paragraph("Merchant/Admin campaign creation endpoint.", table_cell)],
        [Paragraph("POST", table_cell), Paragraph("<code>/api/v1/lottery/claim-ticket</code>", table_cell), Paragraph("Mints ticket via story share or points exchange.", table_cell)],
        [Paragraph("POST", table_cell), Paragraph("<code>/api/v1/lottery/ocr-verify</code>", table_cell), Paragraph("FastAPI AI Vision OCR screenshot tag validator.", table_cell)],
        [Paragraph("POST", table_cell), Paragraph("<code>/api/v1/lottery/draw</code>", table_cell), Paragraph("Triggers cryptographic provably fair draw.", table_cell)]
    ]
    a_table = Table(api_data, colWidths=[55, 195, 254])
    a_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(a_table)

    story.append(PageBreak())

    # ==========================================
    # MODULE 3: GAMIFICATION & SOCIAL ENGINE
    # ==========================================
    story.append(Paragraph("MODULE 3: GAMIFICATION & INSTAGRAM SOCIAL ENGINE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

    story.append(Paragraph("3.1 Solving the Cold-Start Problem with Behavioral Signals", h2_style))
    story.append(Paragraph(
        "Instead of forcing zero-history users through tedious onboarding surveys, Tripzy's Instagram-style gamification captures natural micro-actions "
        "and injects them into the Layer 2 Recommendation Engine:",
        body_style
    ))

    gam_data = [
        [Paragraph("Gamification Component", table_header), Paragraph("User Micro-Action", table_header), Paragraph("Engine Signal Captured", table_header)],
        [
            Paragraph("<b>Instagram Stories Bar</b>", table_cell),
            Paragraph("5-second auto-advancing visual slides with glowing Turkish gradient rings.", table_cell),
            Paragraph("Category Affinity, Story dwell duration, direct deal click.", table_cell)
        ],
        [
            Paragraph("<b>Double-Tap Heart Burst</b>", table_cell),
            Paragraph("Double-tapping deal image triggers floating particle hearts + haptic vibration.", table_cell),
            Paragraph("Implicit like score +10 XP. Immediate category boost in latent vector.", table_cell)
        ],
        [
            Paragraph("<b>Daily Exploration Streak</b>", table_cell),
            Paragraph("Consecutive login tracking (🔥 3 Günlük Seri!) with escalating XP & points.", table_cell),
            Paragraph("User retention tier, engagement cadence, loyalty tier ranking.", table_cell)
        ],
        [
            Paragraph("<b>Interactive Scratch Cards</b>", table_cell),
            Paragraph("HTML5 Canvas scratch-off foil unlocking instant discount vouchers at 45% clear.", table_cell),
            Paragraph("Price sensitivity & impulse conversion willingness.", table_cell)
        ],
        [
            Paragraph("<b>Digital Travel Passport</b>", table_cell),
            Paragraph("Passport booklet with Turkish city stamps (Istanbul, Cappadocia, Bodrum, Antalya).", table_cell),
            Paragraph("Geographic affinity, luxury vs budget preference clustering.", table_cell)
        ],
        [
            Paragraph("<b>Live Turkish Savings Ticker</b>", table_cell),
            Paragraph("Real-time ticker ('Ahmet K. İstanbul\\'da ₺450 tasarruf etti') & City Leaderboards.", table_cell),
            Paragraph("FOMO urgency amplification & community validation.", table_cell)
        ]
    ]
    g_table = Table(gam_data, colWidths=[130, 200, 174])
    g_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(g_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("3.2 Admin Operational Hub Controls (/admin)", h2_style))
    story.append(Paragraph(
        "Platform administrators retain 100% operational control over all gamification features via dedicated tabs:<br/>"
        "• <b>Stories & Badges Tab (<code>AdminGamificationTab.tsx</code>):</b> Create, activate, reorder, and preview live stories.<br/>"
        "• <b>Social Raffles Tab (<code>AdminRafflesTab.tsx</code>):</b> Configure giveaways, prize values, quotas, and trigger one-click random draws.<br/>"
        "• <b>Lottery & Webhooks Tab (<code>AdminLotteryTab.tsx</code>):</b> Monitor Instagram <b>@tripzydeal</b> webhook logs, OCR verifications, and cryptographic draw seeds.",
        body_style
    ))

    story.append(PageBreak())

    # ==========================================
    # MODULE 4: ROADMAP & DATABASE SCHEMAS
    # ==========================================
    story.append(Paragraph("MODULE 4: DATABASE SCHEMAS & IMPLEMENTATION ROADMAP", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

    story.append(Paragraph("4.1 Supabase PostgreSQL Database Schemas", h2_style))
    story.append(Paragraph(
        "The following SQL schemas define the relational data structure supporting campaigns, minted tickets, and cryptographic audit draws:",
        body_style
    ))

    sql_code = """-- 1. Flash Lottery Campaigns Table
CREATE TABLE IF NOT EXISTS public.lottery_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES public.profiles(id),
    title VARCHAR(255) NOT NULL,
    title_tr VARCHAR(255),
    prize_description TEXT NOT NULL,
    total_winners INT DEFAULT 1,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'drawn', 'cancelled'
    winning_ticket_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Minted Lottery Tickets Table
CREATE TABLE IF NOT EXISTS public.lottery_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.lottery_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. TRPZ-LOT-89210
    verification_method VARCHAR(50) NOT NULL,  -- 'story_canvas', 'ocr_screenshot', 'points_exchange'
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cryptographic Draw Audit Table
CREATE TABLE IF NOT EXISTS public.lottery_draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.lottery_campaigns(id),
    winning_ticket_id UUID REFERENCES public.lottery_tickets(id),
    winning_user_id UUID REFERENCES public.profiles(id),
    draw_seed VARCHAR(255) NOT NULL, -- SHA-256 Seed for mathematical audit
    drawn_at TIMESTAMPTZ DEFAULT NOW()
);"""

    sql_table = Table([[Preformatted(sql_code, code_style)]], colWidths=[504])
    sql_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0f172a")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#334155")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(sql_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("4.2 System Verification & Test Status", h2_style))
    story.append(Paragraph(
        "• <b>Frontend Test Suite (Vitest):</b> 39 / 39 tests passing (100% green). Covers ticket minting, canvas generator, OCR verification, streak logic, wallet tickets, and deals transformation.<br/>"
        "• <b>Backend Test Suite (Pytest):</b> 20 / 20 tests passing (100% green). Covers FastAPI endpoints, SVD matrix factorization, location updates, and lottery Pydantic schemas.<br/>"
        "• <b>Zero TypeScript & Build Errors:</b> Full production build builds clean PWA bundles ready for multi-tenant deployment.",
        body_style
    ))

    # Build PDF for all requested output paths
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
        print(f"Successfully generated master PDF: {path}")

if __name__ == '__main__':
    workspace_pdf = r"c:\Users\elif\Documents\antigravity\happy-hopper\docs\TRIPZY_MASTER_ARCHITECTURE_AND_MONETIZATION.pdf"
    artifact_pdf = r"C:\Users\elif\.gemini\antigravity\brain\32665860-31cb-43ce-86fe-a33f66a25bdc\tripzy_master_architecture.pdf"
    create_master_pdf([workspace_pdf, artifact_pdf])
