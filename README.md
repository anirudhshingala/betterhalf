# betterhalf

Personal pages served under the `/betterhalf/` path.

```
.
├── bday/          → /betterhalf/bday/   — Jetakshi's birthday keepsake
└── .nojekyll         stops GitHub Pages running Jekyll over the files
```

Each subfolder is a self-contained static site with no build step. Open the
one you want and read its own README.

---

## Where it's served

GitHub Pages maps **one repository to one path segment**, which is why the
site lives in a `bday/` subfolder of a repo named `betterhalf` rather than in
a repo of its own:

| | |
|---|---|
| Repo | [`anirudhshingala/betterhalf`](https://github.com/anirudhshingala/betterhalf) |
| GitHub Pages | <https://anirudhshingala.github.io/betterhalf/bday/> |
| Intended custom-domain path | `https://anirudhshingala.com/betterhalf/bday/` |

> The custom-domain path needs a Cloudflare route — `anirudhshingala.com`
> currently belongs to the `my-profile-website` repo, and GitHub does not
> automatically nest other repos underneath a *project* site's custom domain.
> See **Custom domain** in [`bday/README.md`](bday/README.md).

Every path inside each subfolder is **relative**, so the same files work
unchanged from `file://`, from `localhost`, from the `github.io` URL, and from
any custom-domain path — no rebuild, no config switch.

---

## Local development

```bash
cd bday
python serve.py        # http://localhost:8080
```

Use `serve.py` rather than `python -m http.server` — it disables caching, and
a stale cached `js/config.js` is the most confusing failure mode in this repo.
