# betterhalf

Personal pages served under the `/betterhalf/` path.

```
.
├── index.html     redirects the bare domain → bday/
├── bday/          Jetakshi's birthday keepsake
├── CNAME          betterhalf.anirudhshingala.com
└── .nojekyll      stops GitHub Pages running Jekyll over the files
```

Each subfolder is a self-contained static site with no build step. Open the
one you want and read its own README.

---

## Where it's served

| | |
|---|---|
| Repo | [`anirudhshingala/betterhalf`](https://github.com/anirudhshingala/betterhalf) |
| **Live** | <https://betterhalf.anirudhshingala.com/bday/> |
| Bare domain | <https://betterhalf.anirudhshingala.com/> → redirects to `/bday/` |
| GitHub Pages origin | `anirudhshingala.github.io/betterhalf/` (301s to the custom domain) |

### Why a subdomain rather than `anirudhshingala.com/betterhalf/bday/`

GitHub only nests project repos underneath a custom domain when that domain
sits on a **user site** (`<user>.github.io`). There is no such repo here —
`anirudhshingala.com` belongs to `my-profile-website`, which is itself a
*project* site. Serving this repo under that path would have meant either a
Cloudflare Worker proxying `/betterhalf/*`, or folding these files into the
portfolio repo. A subdomain is one DNS record and touches nothing else.

### DNS

One record in Cloudflare, **DNS-only (grey cloud)**:

```
CNAME   betterhalf   →   anirudhshingala.github.io
```

Grey cloud matters. Proxying (orange) hides the record from GitHub's
verification, so GitHub cannot issue the Let's Encrypt certificate and
*Enforce HTTPS* stays greyed out. Leave it unproxied at least until the
certificate is issued.

Every path inside each subfolder is **relative**, so the same files work
unchanged from `file://`, from `localhost`, from the `github.io` URL, and from
the custom domain — no rebuild, no config switch.

---

## Local development

```bash
cd bday
python serve.py        # http://localhost:8080
```

Use `serve.py` rather than `python -m http.server` — it disables caching, and
a stale cached `js/config.js` is the most confusing failure mode in this repo.
