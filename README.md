TSender UI
A 100% client-side UI for the TSender contract.


TSender UI
Getting Started
Requirements
Environment Variables
Setup
Testing
Unit
e2e
Contributing
Getting Started
Requirements
node
You'll know you've installed it right if you can run node --version and get a response like v23.0.1
pnpm
You'll know you've installed it right if you can run pnpm --version and get a response like 10.1.0
git
You'll know you've installed it right if you can run git --version and get a response like git version 2.33.0
Environment Variables
You'll need a .env.local the following environment variables:

NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: Project ID from reown cloud
Setup
cd tsender-ui
pnpm install
pnpm anvil
You'll want to make sure you have a Metamask/Rabby wallet connected to your anvil instance. Ideally you're connected to the wallet that comes with the default anvil instance. This will have some mock tokens in it.

Then, in a second browser run:

pnpm run dev
Testing
Unit
pnpm test:unit
e2e
Playwright should also install the browsers needed to run tests.

To test e2e, do the following

pnpm cache
Then run:

pnpm test:e2e
This will throw an error like:

Error: Cache for 08a20e3c7fc77e6ae298 does not exist. Create it first!
The 08a20e3c7fc77e6ae298 is your CACHE_NAME

In your .cache-synpress folder, rename the folder that isn't metamask-chrome-*** to your CACHE_NAME.

Then, you should be able to run:

pnpm test:e2e
And it'll work!
