# Update v2.0

## New
- The Parent Portal has been completely redesigned. On a phone every page gets a large title and a floating glass tab bar, home opens with a hero in your ninja's belt color, and courses show kits, tracks and modules with the family's own art throughout. Desktop gets a floating toolbar with a child switcher.
- A ninja can now belong to more than one center. Directors share a ninja in from the Locations page, and removing them from a shared center takes them off that roster only, while their home center keeps them. No more duplicate records for a family that attends two centers.
- New staff get their badge. Onboarding now prints your name, avatar and username onto a 3D staff ID card you can spin around while you set up your account.
- Edit Profile is your ID card now. Tap your name to retype it right on the card, tap your photo to slide through the avatars, and tap the card to turn it over, since your username is printed on the back. Every change saves on its own, no form and no Save button.
- Clicking a staff member hands you their ID card, with their progress logs on a sheet of paper tucked behind it. Tap the paper to read the logs, tap the card to bring it back. The whole desk sizes itself to your screen, filling a desktop and fitting a phone without any scrolling.
- When logging CREATE, an added project now has its own belt and level. A ninja who finished a level, or a whole belt, part way through class gets written down once instead of needing a second check in.
- Event listings. Center Directors get an Events page for promoting what's happening at the center: a title, a hook line, a banner image, a date and time, a sign up link, and a description with real formatting, written in the same editor senseis log with. Save a draft to keep working on it, publish when it's ready.
- Families see your events. Published listings show as a banner at the top of the Parent Portal home, rotating like a slideshow when there's more than one. Learn more grows the banner open right there with the full details and a Sign up button, and a dated event takes itself down once the day passes.
- Hovering Dashboard in the nav opens a quick menu with Events, Tasks, Reports, Curriculum and What's New, so the director tools are one hover away without making the sidebar longer.

## Changes
- Logging a session takes you back to Today's Board. If a ninja is checked into more than one class, or has make up sessions to catch up on, the page stays where it is and moves you to the next class so you can finish them in one sitting.
- A class you have already logged comes off the "which program are you logging" list, so only the classes still to do are on it. If everything is logged they all come back, since that visit is a correction.
- Once a center is connected to MyStudio, every sensei at that center sees the booked list. It used to sit behind the Experimental toggle, which was a per browser setting, so connecting a center changed nothing for anyone else. The Experimental toggle now only covers the theme customizer.
- The MyStudio sign in expires after about 24 hours on their end, and DojoLink now says so instead of being surprised by it. The account page shows exactly when it runs out and turns amber in the last six hours, and the board gives directors a heads up with a link to renew. This is MyStudio's session policy, so a daily renewal is normal, not a fault.
- DojoLink now installs properly as an app. Added a real web app manifest with the DojoLink mark, so home screen shortcuts and installed apps get the right icon instead of a blank.
- The back of the staff badge now says Username where it used to say Staff ID.
- A family with one ninja gets a full width card on the Parent Portal home instead of half the page sitting empty.
- On desktop, the Parent Portal course list stays one screen tall and scrolls on its own, so a ninja in many programs no longer stretches the page.
- The belt road marks the current belt by size and a lit trail behind it instead of a white ring, and you can drag it sideways with the mouse.

## Bug Fixes
- Typing a link like code.org into session notes made it clickable while you were still writing, so clicking near it to move your cursor opened the website and left the half written log behind. Links in the editor are just text now. In saved logs and comments they are real links, underlined and changing color on hover so you can tell before you click.
- Session notes were written once per class, but printed under every project. Logging two projects in one sitting showed the note twice, which read as two sessions that happened to say the same thing. It prints once now.
- Switching to another class while logging kept the note you had written for the previous class sitting in the box, which could submit one class's note under another. Switching starts a clean note now.
- On a phone, opening a course in the Parent Portal started part way down the page instead of at the top, and the course hero had gaps and corners that let the page show through. Both fixed.
- The belt card on the parent home could overlap itself, and the current belt's glow was clipped by the belt ladder. Both have room now.
- For admin accounts, the floating view switcher pill could sit on top of open dialogs and cover what they were saying. Dialogs stack above it now.
- Clicking the empty space around a staff member's ID card now closes it. An invisible box was catching the click and keeping the card open.
