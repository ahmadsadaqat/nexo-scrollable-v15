const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script_path = path.resolve(
	__dirname,
	"../nexo_scrollable/public/js/scrollable_items_grid.js"
);
const script = fs.readFileSync(script_path, "utf8");

const expected_doctypes = [
	"BOM",
	"BOM Creator",
	"Blanket Order",
	"Delivery Note",
	"Installation Note",
	"Job Card",
	"Landed Cost Voucher",
	"Maintenance Schedule",
	"Material Request",
	"Opportunity",
	"POS Invoice",
	"Packing Slip",
	"Pricing Rule",
	"Product Bundle",
	"Promotional Scheme",
	"Purchase Invoice",
	"Purchase Order",
	"Purchase Receipt",
	"Quotation",
	"Request for Quotation",
	"Sales Invoice",
	"Sales Order",
	"Stock Entry",
	"Stock Reconciliation",
	"Subcontracting Order",
	"Subcontracting Receipt",
	"Supplier Quotation",
];
const handlers = new Map();
let registration_count = 0;

const context = {
	frappe: {
		boot: { versions: { frappe: "15.101.0" } },
		meta: { docfield_map: {} },
		model: {
			is_non_std_field: () => true,
			layout_fields: [],
		},
		ui: {
			form: {
				on(doctype, registered_handlers) {
					registration_count += 1;
					handlers.set(doctype, registered_handlers);
				},
			},
		},
	},
};

vm.runInNewContext(script, context);

function make_grid() {
	const docfields = Array.from({ length: 6 }, (_, index) => ({
		columns: 2,
		fieldname: `custom_column_${index + 1}`,
		fieldtype: "Data",
		hidden: 0,
		in_list_view: 1,
		permlevel: 0,
	}));
	const container = {
		classes: [],
		addClass(class_name) {
			this.classes.push(class_name);
			return this;
		},
		off() {
			return this;
		},
		on() {
			return this;
		},
	};

	const grid = {
		docfields,
		fields_map: Object.fromEntries(docfields.map((df) => [df.fieldname, df])),
		frm: { get_perm: () => true },
		make_head() {
			this.header_row = {
				validate_columns_width() {
					throw new Error("v15 width validation still active");
				},
			};
		},
		reset_grid() {
			this.make_head();
			this.setup_visible_columns();
		},
		setup_user_defined_columns() {},
		update_default_colsize(df) {
			df.colsize = 2;
		},
		wrapper: {
			find: () => container,
		},
	};

	return { container, grid };
}

assert.deepEqual([...handlers.keys()].sort(), [...expected_doctypes].sort());

for (const doctype of expected_doctypes) {
	const { container, grid } = make_grid();
	const frm = { fields_dict: { items: { grid } } };
	const doctype_handlers = handlers.get(doctype);

	doctype_handlers.refresh(frm);

	assert.equal(grid.__nexo_scrollable_patched, true, `${doctype} was not patched`);
	assert.equal(
		grid.visible_columns.length,
		6,
		`${doctype} omitted columns beyond the v15 width limit`
	);
	assert.ok(container.classes.includes("nexo-scrollable-child-grid"));
	assert.doesNotThrow(() => grid.header_row.validate_columns_width());

	const patched_make_head = grid.make_head;
	doctype_handlers.onload_post_render(frm);
	assert.equal(grid.make_head, patched_make_head, `${doctype} was patched more than once`);
}

assert.doesNotThrow(() => handlers.get("Sales Order").refresh({ fields_dict: {} }));

vm.runInNewContext(script, context);
assert.equal(registration_count, expected_doctypes.length, "handlers were registered twice");

context.frappe.boot.versions.frappe = "16.0.0";
const { grid: v16_grid } = make_grid();
handlers.get("Purchase Invoice").refresh({ fields_dict: { items: { grid: v16_grid } } });
assert.equal(v16_grid.__nexo_scrollable_patched, undefined, "v15 override ran on Frappe v16");

console.log("nexo_scrollable transaction items grid tests passed");
