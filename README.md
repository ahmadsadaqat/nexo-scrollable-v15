### Nexo Scrollable

Backports the horizontally scrollable child-table experience to Frappe v15 without modifying
Frappe or ERPNext source files.

The integration is scoped to the standard **Items** grid on ERPNext buying, selling, stock,
manufacturing, maintenance, and subcontracting forms. This includes Sales Invoice, Purchase
Invoice, Sales Order, Purchase Order, Quotation, Delivery Note, Purchase Receipt, Material
Request, Stock Entry, and the other standard ERPNext forms that use an `items` child table. It:

- allows configured grid columns to exceed the v15 width limit;
- renders all selected columns with stable widths;
- adds native horizontal scrolling; and
- closes Link-field suggestions when horizontal scrolling would detach them from their input.

The JavaScript includes a Frappe v15 guard, so the compatibility override is inactive on other
major framework versions. It is also registered once per browser session and patches each grid
instance once, allowing the same shared asset to support all configured forms safely.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app nexo_scrollable
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/nexo_scrollable
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
