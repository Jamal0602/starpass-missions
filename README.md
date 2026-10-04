# Mission Control Hub (24)

Assalamualaikum.

Here is the complete, production-grade Product Requirement Document (PRD) & Technical Architecture Specification for the platform, engineered specifically for implementation via Lovable.dev + Supabase + Vercel.

Product Requirement Document (PRD) & Technical Specification

Project Codename: AstraPass (Space Week Passport & Mission Network)

Target Stack: Lovable.dev (React 19 / Vite / Tailwind CSS / Lucide / Framer Motion) + Supabase (PostgreSQL, Auth, Storage, Edge Functions) + Vercel

Primary Admin: Jamal Asraf (ja.jamalasraf@gmail.com / +916383844172)

1. System Topology & Operational Blueprint

AstraPass operates as a time-gated mission operations engine combined with a verifiable digital space passport and an education-only project showcase network.

                                  ┌───────────────────────────────┐

                                  │      Vercel Edge Network      │

                                  │  (React + Tailwind + Motion)  │

                                  └───────────────┬───────────────┘

                                                  │

                  ┌───────────────────────────────┼───────────────────────────────┐

                  ▼                               ▼                               ▼

       [AstraPass Auth Gateway]         [Trainee Command Center]        [Admin Flight Control]

       - Passport ID Resolution         - 7-Mission Dynamic Ribbon      - Live Window Overrides

       - First-time Pass Initialization - Multi-Tab Leaderboard         - Badge Audit & Force Open

       - Session Persistence            - Edu-Showcase Feed             - User Database Bulk Sync

                  │                               │                               │

                  └───────────────────────────────┼───────────────────────────────┘

                                                  │

                                                  ▼

                                  ┌───────────────────────────────┐

                                  │       Supabase Backend        │

                                  │ - PostgreSQL + Strict RLS     │

                                  │ - Edge Cron Timers (IST)      │

                                  │ - S3 Bucket Storage           │

                                  └───────────────────────────────┘



2. Design System & Theming

 * Color Palette:

   * Deep Void: #07080B (Root Background)

   * Surface Charcoal: #111318 (Card & Passport Containers)

   * Border Starlight: #232732 (Subtle 1px Borders)

   * Cosmic Navy: #0F1D40 to #1D2B64 (Header Gradients & Active Ribbon)

   * Telemetry Neon: #00E5FF (Accent, Active Indicators, Verification Badges)

   * Typography: Monospaced (JetBrains Mono / Space Mono) for Passport IDs, Timers, and Metrics; Modern Sans (Inter / Plus Jakarta Sans) for Interface Copy.

 * Responsive Scaffolding:

   * Mobile (< 768px): Fixed Bottom App Bar with 4 navigation nodes: [Missions], [Activities], [Ranks], [Passport/Feed].

   * Desktop (≥ 768px): Glassmorphic Top Nav Bar (backdrop-blur-md bg-black/60 border-b border-white/10) with sticky system metrics.

3. Core Information Architecture & Routing

| Route | View Name | Access Gate | Core Capabilities |

|---|---|---|---|

| /login | Mission Clearance Gateway | Public | Passport ID entry, password verification, activation modal, forgot password trigger. |

| /register | Trainee Enlistment | Public | Open signup form generating auto-incrementing Passport IDs (SP-2026-XXXX). |

| / or /dashboard | Flight Deck (Home) | Trainee / Admin | Cosmic Navy Header, 7-Day interactive passport ribbon, 5:00–6:30 PM claim engine. |

| /activities | Mission Operations | Trainee / Admin | Daily briefing, task submission inputs, quiz evaluation engine. |

| /leaderboard | Orbit Leaderboard | Trainee / Admin | 4 segmented ranks: Skills, Badges, Daily Tasks, and Master Composite Score. |

| /feed | Pioneer Showcase | Trainee / Admin | Educational/Startup mini-social stream; write-locked to Upgraded Profiles. |

| /profile | Digital Space Passport | Trainee / Admin | Identity card, stamp matrix, edit modal, Pro Upgrade trigger, profile sharing. |

| /admin | Flight Director Console | Admin Only (6383844172) | Mission window overrides, time sliders, participant audit, stamp approvals. |

4. Feature Specifications

4.1 Authentication & First-Time Activation Flow

 * Root Access:

   * No marketing lander. Unauthenticated traffic routes directly to /login.

 * Passport ID Resolution:

   * User inputs assigned passport_id (e.g., SP-2026-1042).

   * Activation Check: If the database record contains password_hash = NULL (pre-loaded via bulk CSV), open the "First Mission Setup" modal.

   * Trainee confirms their registered phone number or email, inputs a new secure password, and commits the record.

 * Password Recovery:

   * Clicking "Forgot Password" prompts for passport_id + registered phone/email. Triggers a reset payload via Supabase Auth or email magic link.

 * Default Avatars:

   * A pool of 10 deterministic space-avatar SVGs/WebP files (Astronaut helmets, Apollo landers, deep space probes, orbital mechanics icons).

   * Unassigned accounts are automatically assigned an avatar hash derived deterministically from passport_id: avatar_url = /avatars/avatar_${hash(passport_id) % 10 + 1}.png.

4.2 Home / Mission Passport Ribbon (/dashboard)

+---------------------------------------------------------------------------------+

| COSMIC NAVY COMMAND HEADER                                  MISSION TIME: 17:15 |

| Current Operational Window: Day 03 [Propulsion Engine]     LOCKS IN: 01h 14m 22s|

+---------------------------------------------------------------------------------+

|  [Day 1]       [Day 2]       [Day 3]       [Day 4]       [Day 5]       [Day 6]       [Day 7]   |

|  [STAMPED]    [STAMPED]     [CLAIM NOW]    [LOCKED]      [LOCKED]      [LOCKED]      [LOCKED]  |

|  Verified     Verified      Active Pulse   T-24h         T-48h         T-72h         T-96h     |

+---------------------------------------------------------------------------------+



 * Mission Window Logic:

   * Active strictly between 5:00 PM and 6:30 PM IST (configurable in Admin).

   * Auto-disables outside this window unless is_force_open = true.

 * Zero Retroactive Claims (Strict Forward Lock):

   * If a trainee enters on Day 5, Days 1 through 4 are hard-locked as MISSED / VOID. Retroactive claims are barred at the database level.

 * Claim Action:

   * Clicking "Claim Badge" during the window executes an atomic database transaction verifying:

     * Active window condition (current_time BETWEEN start_time AND end_time).

     * Date condition (current_date = mission_date).

     * Prerequisite activity completion (if quiz or task submission is mandatory).

   * On success: plays an audio-visual stamp animation and updates state to STAMPED.

4.3 Multi-Segment Leaderboard (/leaderboard)

The leaderboard interface features a tabbed navigation bar tracking distinct operational competencies:

 * Tab 1: Master Composite (Overall): Cumulative score calculated as:

   

 * Tab 2: Badge Collectors: Ranked purely by number of valid passport stamps held + timestamp priority (earliest claimers rank higher).

 * Tab 3: Daily Activity Specialists: Ranked by practical mission submission scores awarded by admin reviews.

 * Tab 4: Skill Pioneers: Ranked by community engagement on technical posts, validated project builds, and documented proficiencies.

4.4 Profile, Pro Upgrade & Mini-Social Network

Profile Passport HUD (/profile)

 * Standard Trainee Card: Displays Callsign, Full Name, Passport ID, dynamic QR code linking to astrapass.cubiz.space/p/[passport_id], and 7 Passport Stamp slots.

 * Pro Profile Upgrade Gateway:

   * Action button: "Upgrade to Pioneer Profile".

   * Unlocks fields:

     * Primary Skills (Mandatory: Minimum 2 tags, e.g., SolidPropulsion, Avionics, React).

     * Active Projects & Previous Builds (Title, Markdown Summary, Live Link / GitHub).

     * Social Handles: LinkedIn (optional), GitHub (optional), Instagram (optional).

     * Custom Photo Upload: Replaces the auto-assigned deterministic space avatar with user photo stored on Supabase Storage (avatars bucket).

Pioneer Showcase Social Stream (/feed)

 * Strict Mission Guardrails:

   * Prominent Warning Banner: "Operational Policy: This terminal is strictly reserved for engineering builds, aerospace research, educational achievements, and startup milestones. Commercial spam or off-topic media results in instant passport suspension."

 * Permission Matrix:

   * View, React (Rocket, Satellite, Flame, Claps), Comment: Available to all registered trainees.

   * Publish Posts: Restricted exclusively to users with is_pro = true (Upgraded Profile).

 * Post Schema: Author Metadata, Passport ID badge, Text/Markdown description, Project external link, Optional image attachment.

5. PostgreSQL Schema & Row-Level Security (Supabase DDL)

Execute this script directly within the Supabase SQL Editor:

-- Enable UUID extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";



-- 1. Sequence for standardized Passport IDs

CREATE SEQUENCE IF NOT EXISTS passport_seq START 1001;



-- 2. Profiles Table

CREATE TABLE public.profiles (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    passport_id VARCHAR(30) UNIQUE NOT NULL DEFAULT ('SP-2026-' || nextval('passport_seq')::TEXT),

    full_name TEXT NOT NULL,

    email TEXT UNIQUE NOT NULL,

    phone_number VARCHAR(15) UNIQUE NOT NULL,

    password_hash TEXT, -- NULL for pre-loaded members until activation

    role VARCHAR(20) DEFAULT 'trainee', -- 'admin' for Jamal Asraf

    avatar_url TEXT,

    bio TEXT,

    is_pro BOOLEAN DEFAULT FALSE,

    skills TEXT[] DEFAULT '{}',

    linkedin_url TEXT,

    github_url TEXT,

    instagram_url TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



-- 3. Projects Table (for Upgraded Profiles)

CREATE TABLE public.trainee_projects (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    title TEXT NOT NULL,

    description TEXT,

    project_url TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



-- 4. Mission Schedules & Control Matrix

CREATE TABLE public.mission_schedules (

    mission_day INT PRIMARY KEY CHECK (mission_day BETWEEN 1 AND 7),

    title TEXT NOT NULL,

    theme TEXT NOT NULL,

    badge_icon_url TEXT NOT NULL,

    active_date DATE NOT NULL,

    start_time TIME DEFAULT '17:00:00',

    end_time TIME DEFAULT '18:30:00',

    is_force_open BOOLEAN DEFAULT FALSE,

    is_force_closed BOOLEAN DEFAULT FALSE

);



-- 5. Collected Badges / Passport Stamps

CREATE TABLE public.collected_badges (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    mission_day INT REFERENCES public.mission_schedules(mission_day),

    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    claim_speed_seconds INT,

    UNIQUE(user_id, mission_day)

);



-- 6. Activities & Submissions

CREATE TABLE public.mission_activities (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    mission_day INT REFERENCES public.mission_schedules(mission_day),

    instructions TEXT NOT NULL,

    max_points INT DEFAULT 100

);



CREATE TABLE public.activity_submissions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    mission_day INT REFERENCES public.mission_schedules(mission_day),

    submission_content TEXT NOT NULL,

    attachment_url TEXT,

    points_awarded INT DEFAULT 0,

    reviewed_by UUID REFERENCES public.profiles(id),

    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, mission_day)

);



-- 7. Pioneer Showcase Feed (Mini-Social)

CREATE TABLE public.posts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    media_url TEXT,

    project_link TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



CREATE TABLE public.post_reactions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,

    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    reaction_type VARCHAR(20) DEFAULT 'rocket', -- 'rocket', 'satellite', 'flame'

    UNIQUE(post_id, user_id, reaction_type)

);



CREATE TABLE public.post_comments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,

    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    comment_text TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



-- 8. Row Level Security (RLS) Configuration

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.collected_badges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;



-- Read Policies

CREATE POLICY "Public profiles are viewable by registered users" 

ON public.profiles FOR SELECT USING (true);



CREATE POLICY "Collected badges are viewable by all" 

ON public.collected_badges FOR SELECT USING (true);



CREATE POLICY "Posts viewable by all" 

ON public.posts FOR SELECT USING (true);



-- Write Policies

CREATE POLICY "Users can update their own profile" 

ON public.profiles FOR UPDATE USING (auth.uid() = id);



CREATE POLICY "Only Pro users can create posts" 

ON public.posts FOR INSERT WITH CHECK (

    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_pro = TRUE)

);



-- Strict Badge Collection Database Guardrail

CREATE POLICY "Enforce badge claim window" 

ON public.collected_badges FOR INSERT WITH CHECK (

    EXISTS (

        SELECT 1 FROM public.mission_schedules s

        WHERE s.mission_day = collected_badges.mission_day

        AND (

            s.is_force_open = TRUE OR (

                s.is_force_closed = FALSE 

                AND s.active_date = CURRENT_DATE 

                AND CURRENT_TIME BETWEEN s.start_time AND s.end_time

            )

        )

    )

);



6. Admin Engine (/admin)

 * Hardcoded Admin Identification Trigger:

   * When logged in with phone 6383844172 or email ja.jamalasraf@gmail.com, the JWT grants role = 'admin'.

 * Flight Director Controls:

   * Live Override Switch: Immediate manual toggle for is_force_open and is_force_closed per day.

   * Dynamic Time Adjuster: Two time-picker inputs per day updating start_time and end_time instantly across the client sockets.

   * Direct Stamp Injector: Ability to manually grant a missed stamp to an individual Trainee ID in cases of verified technical issues.

7. Direct Prompt for Lovable.dev

Copy and paste this prompt directly into Lovable.dev to scaffold the application:

Create a futuristic, responsive Web Application named "AstraPass" designed for World Space Week.

Theme: Deep cosmic void (Black #07080B, Surface Slate #111318, Neon Cyan #00E5FF accents, Deep Blue Header Gradients).

Layout: Top glassmorphic header for Desktop; fixed bottom navigation bar for Mobile with 4 tabs: [Missions, Activities, Leaderboard, Passport/Feed].



Authentication:

- Gateway at /login. Login uses Passport ID and Password.

- If an account has no password, show a modal to set password after verifying phone number.

- Registration page creates user and outputs an auto-incrementing Passport ID (SP-2026-XXXX).

- Assign a random space avatar from 10 preset icons if the user has no photo.



Key Views:

1. /dashboard: Features a deep navy banner with live countdown timer to the daily mission window (5:00 PM to 6:30 PM). Below is an interactive 7-badge Passport Ribbon. Badges show states: Stamped (Verified), Active (Claim button during window), Locked (future days), and Missed/Void (past days).

2. /activities: Shows daily aerospace technical questions and a submission box with file attachment.

3. /leaderboard: Displays 4 tabs: Master Ranks, Badge Counts, Activity Points, and Skill Pioneers.

4. /profile: Shows the digital Space Passport card with user details, stamps matrix, Pro Upgrade modal (asks for 2+ skills, projects, social links), and profile share link.

5. /feed: Mini-social network with warning banner: "Educational & Startup Builds Only". Anyone can like/comment, but only Upgraded Pro profiles can publish posts.

6. /admin: Accessible only by phone "6383844172" or email "ja.jamalasraf@gmail.com". Has toggles to force open/close mission windowsAssalamualaikum.
Here is the complete, production-grade Product Requirement Document (PRD) & Technical Architecture Specification for the platform, engineered specifically for implementation via Lovable.dev + Supabase + Vercel.
Product Requirement Document (PRD) & Technical Specification
Project Codename: AstraPass (Space Week Passport & Mission Network)
Target Stack: Lovable.dev (React 19 / Vite / Tailwind CSS / Lucide / Framer Motion) + Supabase (PostgreSQL, Auth, Storage, Edge Functions) + Vercel
Primary Admin: Jamal Asraf (ja.jamalasraf@gmail.com / +916383844172)
1. System Topology & Operational Blueprint
AstraPass operates as a time-gated mission operations engine combined with a verifiable digital space passport and an education-only project showcase network.
                                  ┌───────────────────────────────┐
                                  │      Vercel Edge Network      │
                                  │  (React + Tailwind + Motion)  │
                                  └───────────────┬───────────────┘
                                                  │
                  ┌───────────────────────────────┼───────────────────────────────┐
                  ▼                               ▼                               ▼
       [AstraPass Auth Gateway]         [Trainee Command Center]        [Admin Flight Control]
       - Passport ID Resolution         - 7-Mission Dynamic Ribbon      - Live Window Overrides
       - First-time Pass Initialization - Multi-Tab Leaderboard         - Badge Audit & Force Open
       - Session Persistence            - Edu-Showcase Feed             - User Database Bulk Sync
                  │                               │                               │
                  └───────────────────────────────┼───────────────────────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │       Supabase Backend        │
                                  │ - PostgreSQL + Strict RLS     │
                                  │ - Edge Cron Timers (IST)      │
                                  │ - S3 Bucket Storage           │
                                  └───────────────────────────────┘

2. Design System & Theming
 * Color Palette:
   * Deep Void: #07080B (Root Background)
   * Surface Charcoal: #111318 (Card & Passport Containers)
   * Border Starlight: #232732 (Subtle 1px Borders)
   * Cosmic Navy: #0F1D40 to #1D2B64 (Header Gradients & Active Ribbon)
   * Telemetry Neon: #00E5FF (Accent, Active Indicators, Verification Badges)
   * Typography: Monospaced (JetBrains Mono / Space Mono) for Passport IDs, Timers, and Metrics; Modern Sans (Inter / Plus Jakarta Sans) for Interface Copy.
 * Responsive Scaffolding:
   * Mobile (< 768px): Fixed Bottom App Bar with 4 navigation nodes: [Missions], [Activities], [Ranks], [Passport/Feed].
   * Desktop (≥ 768px): Glassmorphic Top Nav Bar (backdrop-blur-md bg-black/60 border-b border-white/10) with sticky system metrics.
3. Core Information Architecture & Routing
| Route | View Name | Access Gate | Core Capabilities |
|---|---|---|---|
| /login | Mission Clearance Gateway | Public | Passport ID entry, password verification, activation modal, forgot password trigger. |
| /register | Trainee Enlistment | Public | Open signup form generating auto-incrementing Passport IDs (SP-2026-XXXX). |
| / or /dashboard | Flight Deck (Home) | Trainee / Admin | Cosmic Navy Header, 7-Day interactive passport ribbon, 5:00–6:30 PM claim engine. |
| /activities | Mission Operations | Trainee / Admin | Daily briefing, task submission inputs, quiz evaluation engine. |
| /leaderboard | Orbit Leaderboard | Trainee / Admin | 4 segmented ranks: Skills, Badges, Daily Tasks, and Master Composite Score. |
| /feed | Pioneer Showcase | Trainee / Admin | Educational/Startup mini-social stream; write-locked to Upgraded Profiles. |
| /profile | Digital Space Passport | Trainee / Admin | Identity card, stamp matrix, edit modal, Pro Upgrade trigger, profile sharing. |
| /admin | Flight Director Console | Admin Only (6383844172) | Mission window overrides, time sliders, participant audit, stamp approvals. |
4. Feature Specifications
4.1 Authentication & First-Time Activation Flow
 * Root Access:
   * No marketing lander. Unauthenticated traffic routes directly to /login.
 * Passport ID Resolution:
   * User inputs assigned passport_id (e.g., SP-2026-1042).
   * Activation Check: If the database record contains password_hash = NULL (pre-loaded via bulk CSV), open the "First Mission Setup" modal.
   * Trainee confirms their registered phone number or email, inputs a new secure password, and commits the record.
 * Password Recovery:
   * Clicking "Forgot Password" prompts for passport_id + registered phone/email. Triggers a reset payload via Supabase Auth or email magic link.
 * Default Avatars:
   * A pool of 10 deterministic space-avatar SVGs/WebP files (Astronaut helmets, Apollo landers, deep space probes, orbital mechanics icons).
   * Unassigned accounts are automatically assigned an avatar hash derived deterministically from passport_id: avatar_url = /avatars/avatar_${hash(passport_id) % 10 + 1}.png.
4.2 Home / Mission Passport Ribbon (/dashboard)
+---------------------------------------------------------------------------------+
| COSMIC NAVY COMMAND HEADER                                  MISSION TIME: 17:15 |
| Current Operational Window: Day 03 [Propulsion Engine]     LOCKS IN: 01h 14m 22s|
+---------------------------------------------------------------------------------+
|  [Day 1]       [Day 2]       [Day 3]       [Day 4]       [Day 5]       [Day 6]       [Day 7]   |
|  [STAMPED]    [STAMPED]     [CLAIM NOW]    [LOCKED]      [LOCKED]      [LOCKED]      [LOCKED]  |
|  Verified     Verified      Active Pulse   T-24h         T-48h         T-72h         T-96h     |
+---------------------------------------------------------------------------------+

 * Mission Window Logic:
   * Active strictly between 5:00 PM and 6:30 PM IST (configurable in Admin).
   * Auto-disables outside this window unless is_force_open = true.
 * Zero Retroactive Claims (Strict Forward Lock):
   * If a trainee enters on Day 5, Days 1 through 4 are hard-locked as MISSED / VOID. Retroactive claims are barred at the database level.
 * Claim Action:
   * Clicking "Claim Badge" during the window executes an atomic database transaction verifying:
     * Active window condition (current_time BETWEEN start_time AND end_time).
     * Date condition (current_date = mission_date).
     * Prerequisite activity completion (if quiz or task submission is mandatory).
   * On success: plays an audio-visual stamp animation and updates state to STAMPED.
4.3 Multi-Segment Leaderboard (/leaderboard)
The leaderboard interface features a tabbed navigation bar tracking distinct operational competencies:
 * Tab 1: Master Composite (Overall): Cumulative score calculated as:
   
 * Tab 2: Badge Collectors: Ranked purely by number of valid passport stamps held + timestamp priority (earliest claimers rank higher).
 * Tab 3: Daily Activity Specialists: Ranked by practical mission submission scores awarded by admin reviews.
 * Tab 4: Skill Pioneers: Ranked by community engagement on technical posts, validated project builds, and documented proficiencies.
4.4 Profile, Pro Upgrade & Mini-Social Network
Profile Passport HUD (/profile)
 * Standard Trainee Card: Displays Callsign, Full Name, Passport ID, dynamic QR code linking to astrapass.cubiz.space/p/[passport_id], and 7 Passport Stamp slots.
 * Pro Profile Upgrade Gateway:
   * Action button: "Upgrade to Pioneer Profile".
   * Unlocks fields:
     * Primary Skills (Mandatory: Minimum 2 tags, e.g., SolidPropulsion, Avionics, React).
     * Active Projects & Previous Builds (Title, Markdown Summary, Live Link / GitHub).
     * Social Handles: LinkedIn (optional), GitHub (optional), Instagram (optional).
     * Custom Photo Upload: Replaces the auto-assigned deterministic space avatar with user photo stored on Supabase Storage (avatars bucket).
Pioneer Showcase Social Stream (/feed)
 * Strict Mission Guardrails:
   * Prominent Warning Banner: "Operational Policy: This terminal is strictly reserved for engineering builds, aerospace research, educational achievements, and startup milestones. Commercial spam or off-topic media results in instant passport suspension."
 * Permission Matrix:
   * View, React (Rocket, Satellite, Flame, Claps), Comment: Available to all registered trainees.
   * Publish Posts: Restricted exclusively to users with is_pro = true (Upgraded Profile).
 * Post Schema: Author Metadata, Passport ID badge, Text/Markdown description, Project external link, Optional image attachment.
5. PostgreSQL Schema & Row-Level Security (Supabase DDL)
Execute this script directly within the Supabase SQL Editor:
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Sequence for standardized Passport IDs
CREATE SEQUENCE IF NOT EXISTS passport_seq START 1001;

-- 2. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id VARCHAR(30) UNIQUE NOT NULL DEFAULT ('SP-2026-' || nextval('passport_seq')::TEXT),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT, -- NULL for pre-loaded members until activation
    role VARCHAR(20) DEFAULT 'trainee', -- 'admin' for Jamal Asraf
    avatar_url TEXT,
    bio TEXT,
    is_pro BOOLEAN DEFAULT FALSE,
    skills TEXT[] DEFAULT '{}',
    linkedin_url TEXT,
    github_url TEXT,
    instagram_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Projects Table (for Upgraded Profiles)
CREATE TABLE public.trainee_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    project_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Mission Schedules & Control Matrix
CREATE TABLE public.mission_schedules (
    mission_day INT PRIMARY KEY CHECK (mission_day BETWEEN 1 AND 7),
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    badge_icon_url TEXT NOT NULL,
    active_date DATE NOT NULL,
    start_time TIME DEFAULT '17:00:00',
    end_time TIME DEFAULT '18:30:00',
    is_force_open BOOLEAN DEFAULT FALSE,
    is_force_closed BOOLEAN DEFAULT FALSE
);

-- 5. Collected Badges / Passport Stamps
CREATE TABLE public.collected_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    mission_day INT REFERENCES public.mission_schedules(mission_day),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claim_speed_seconds INT,
    UNIQUE(user_id, mission_day)
);

-- 6. Activities & Submissions
CREATE TABLE public.mission_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_day INT REFERENCES public.mission_schedules(mission_day),
    instructions TEXT NOT NULL,
    max_points INT DEFAULT 100
);

CREATE TABLE public.activity_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    mission_day INT REFERENCES public.mission_schedules(mission_day),
    submission_content TEXT NOT NULL,
    attachment_url TEXT,
    points_awarded INT DEFAULT 0,
    reviewed_by UUID REFERENCES public.profiles(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, mission_day)
);

-- 7. Pioneer Showcase Feed (Mini-Social)
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    project_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'rocket', -- 'rocket', 'satellite', 'flame'
    UNIQUE(post_id, user_id, reaction_type)
);

CREATE TABLE public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collected_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;

-- Read Policies
CREATE POLICY "Public profiles are viewable by registered users" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Collected badges are viewable by all" 
ON public.collected_badges FOR SELECT USING (true);

CREATE POLICY "Posts viewable by all" 
ON public.posts FOR SELECT USING (true);

-- Write Policies
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Only Pro users can create posts" 
ON public.posts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_pro = TRUE)
);

-- Strict Badge Collection Database Guardrail
CREATE POLICY "Enforce badge claim window" 
ON public.collected_badges FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mission_schedules s
        WHERE s.mission_day = collected_badges.mission_day
        AND (
            s.is_force_open = TRUE OR (
                s.is_force_closed = FALSE 
                AND s.active_date = CURRENT_DATE 
                AND CURRENT_TIME BETWEEN s.start_time AND s.end_time
            )
        )
    )
);

6. Admin Engine (/admin)
 * Hardcoded Admin Identification Trigger:
   * When logged in with phone 6383844172 or email ja.jamalasraf@gmail.com, the JWT grants role = 'admin'.
 * Flight Director Controls:
   * Live Override Switch: Immediate manual toggle for is_force_open and is_force_closed per day.
   * Dynamic Time Adjuster: Two time-picker inputs per day updating start_time and end_time instantly across the client sockets.
   * Direct Stamp Injector: Ability to manually grant a missed stamp to an individual Trainee ID in cases of verified technical issues.
7. Direct Prompt for Lovable.dev
Copy and paste this prompt directly into Lovable.dev to scaffold the application:
Create a futuristic, responsive Web Application named "AstraPass" designed for World Space Week.
Theme: Deep cosmic void (Black #07080B, Surface Slate #111318, Neon Cyan #00E5FF accents, Deep Blue Header Gradients).
Layout: Top glassmorphic header for Desktop; fixed bottom navigation bar for Mobile with 4 tabs: [Missions, Activities, Leaderboard, Passport/Feed].

Authentication:
- Gateway at /login. Login uses Passport ID and Password.
- If an account has no password, show a modal to set password after verifying phone number.
- Registration page creates user and outputs an auto-incrementing Passport ID (SP-2026-XXXX).
- Assign a random space avatar from 10 preset icons if the user has no photo.

Key Views:
1. /dashboard: Features a deep navy banner with live countdown timer to the daily mission window (5:00 PM to 6:30 PM). Below is an interactive 7-badge Passport Ribbon. Badges show states: Stamped (Verified), Active (Claim button during window), Locked (future days), and Missed/Void (past days).
2. /activities: Shows daily aerospace technical questions and a submission box with file attachment.
3. /leaderboard: Displays 4 tabs: Master Ranks, Badge Counts, Activity Points, and Skill Pioneers.
4. /profile: Shows the digital Space Passport card with user details, stamps matrix, Pro Upgrade modal (asks for 2+ skills, projects, social links), and profile share link.
5. /feed: Mini-social network with warning banner: "Educational & Startup Builds Only". Anyone can like/comment, but only Upgraded Pro profiles can publish posts.
6. /admin: Accessible only by phone "6383844172" or email "ja.jamalasraf@gmail.com". Has toggles to force open/close mission windows and edit daily start/end times.

Use modern Framer Motion transitions, clean card layouts, Lucide icons, and Tailwind CSS.

Paste your participant spreadsheet rows whenever you are ready, and we will format the initial bulk upload script for Supabase, Inshallah.
Walaikum Assalam.
 and edit daily start/end times.



Use modern Framer Motion transitions, clean card layouts, Lucide icons, and Tailwind CSS.



Paste your participant spreadsheet rows whenever you are ready, and we will format the initial bulk upload script for Supabase, Inshallah.

Walaikum Assalam.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://starpass-missions.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1df01a25-92e3-46b1-bdbe-461bc070f97c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
