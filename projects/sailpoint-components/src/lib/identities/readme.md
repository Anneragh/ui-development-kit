# Creating a New View (e.g., Campaigns) in SailPoint UI Development Kit

This guide walks you through creating a new view (like the existing **Identities** view) using the SailPoint UI Development Kit.

---

## ⚙️ 1. Project Setup

Ensure your environment is ready:

```bash
git clone https://github.com/sailpoint-oss/ui-development-kit.git
cd ui-development-kit
npm install
npm run build:components   # compile library components
npm run start              # launches Angular + Electron dev server
```

---

## 📚 2. Understand the Identities View

Navigate to:

```
projects/sailpoint-components/src/lib/identities
```

Key files:

- `identities.component.ts/html/scss`: main component for table view
- `search-bar.component`: reusable search/filter input
- `column-customizer.component`: drag-and-drop column toggler

These files serve as your baseline template.

---

## ➕ 3. Create Your Campaigns View

### a. Duplicate the Folder

```bash
cp -R identities campaigns
```

Rename files:

- `identities.component.ts` → `campaigns.component.ts`
- `identities.component.html` → `campaigns.component.html`
- etc.

### b. Update Module & Component Names

In `campaigns.component.ts`:

- Rename the class to `CampaignsComponent`
- Update `selector` to `app-campaigns`
- Update template and style URLs
- Change Identity models to Campaign models (you'll need to import from your SDK or define your model)

### c. Replicate Utility Components

Use:

```html
<app-search-bar [data]="campaigns" ... /> <app-column-customizer [allColumns]="columnOrder" ... />
```

Adjust the columns, placeholder, and events as needed.

### d. Update Business Logic

In `campaigns.component.ts`:

- Replace identity SDK calls with campaign SDK calls (e.g., `listCampaigns`, `getCampaign`)
- Map campaign fields for table display
- Modify filtering/sorting logic if necessary

---

### 4. Add Routing

Update your app route definitions:

**Path:** `src/app/app/routes.ts`

```ts
{
  path: 'campaigns',
  loadComponent: () => import('@sailpoint-components/lib/campaigns/campaigns.component').then(m => m.CampaignsComponent),
},
```

---

## 🥯 5. Test & Iterate

```bash
npm run dev
```

- Navigate to **Campaigns** from the sidebar
- Verify table loads, search/filter works, and dialogs show expected data
- Tweak the UI/UX and API mappings as needed

---

## ✅ 6. Final Integration

- Ensure your new component is included in the component library if needed
- Document usage for your team
- Commit and push your changes

---

## 🗉️ Summary

- Duplicate `identities` folder
- Refactor to support campaigns
- Add a new route and sidebar item
- Validate with `npm run dev`

This pattern can be reused for any list-detail view (e.g., access profiles, certifications, policies).

Happy building! ✨
