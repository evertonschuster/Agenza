# Research

- Decision: compare the OIDC subject and token-derived tenant before replacing an authenticated session. The current reducer sees only the incoming event and loses the old identity.
- Decision: latch identity changes until explicit login. Removing the OIDC user raises another event, and initial reads can resolve late.
- Decision: a session-owned abort signal joins the caller's signal in the existing API middleware, including mutations that do not own a controller.
- Rejected: only re-fetching the current page, keying each feature by tenant, and trusting a client tenant parameter; these leave other loaded state or broaden the security surface.
- Dependencies and APIs were checked in the installed, pinned repository packages. No new library is needed.
