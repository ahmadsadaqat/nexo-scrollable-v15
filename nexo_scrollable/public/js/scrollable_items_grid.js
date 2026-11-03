(() => {
	const REGISTRATION_FLAG = "__nexo_scrollable_items_grid_registered";
	const SCROLLABLE_GRID_CLASS = "nexo-scrollable-child-grid";
	const ITEMS_GRID_FIELDNAME = "items";
	const ITEM_GRID_DOCTYPES = [
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

	if (frappe[REGISTRATION_FLAG]) {
		return;
	}
	frappe[REGISTRATION_FLAG] = true;

	for (const doctype of ITEM_GRID_DOCTYPES) {
		frappe.ui.form.on(doctype, {
			refresh(frm) {
				enable_scrollable_items_grid(frm);
			},

			onload_post_render(frm) {
				enable_scrollable_items_grid(frm);
			},
		});
	}

	function enable_scrollable_items_grid(frm) {
		if (!is_frappe_v15()) {
			return;
		}

		const grid = frm.fields_dict[ITEMS_GRID_FIELDNAME]?.grid;
		if (!grid || grid.__nexo_scrollable_patched) {
			return;
		}

		grid.__nexo_scrollable_patched = true;
		grid.setup_visible_columns = setup_visible_columns_without_limit;

		const original_make_head = grid.make_head;
		grid.make_head = function () {
			const result = original_make_head.apply(this, arguments);
			prepare_grid(this);
			return result;
		};

		grid.visible_columns = [];
		grid.reset_grid();
	}

	function is_frappe_v15() {
		const version = frappe.boot?.versions?.frappe || "";
		return /^15(?:\.|$)/.test(version);
	}

	function prepare_grid(grid) {
		// The v15 column dialog calls this method before saving user settings.
		// Replacing it on every new header row removes the hard-coded width-10 limit.
		if (grid.header_row) {
			grid.header_row.validate_columns_width = () => {};
		}

		const $container = grid.wrapper.find(".form-grid-container");
		$container.addClass(SCROLLABLE_GRID_CLASS);

		$container.off("scroll.nexoScrollable").on("scroll.nexoScrollable", function () {
			if (!this.scrollLeft) {
				return;
			}

			// Link suggestions are absolutely positioned in v15. Close them when the
			// grid moves so the dropdown cannot remain detached from its input.
			(grid.grid_rows || []).forEach((grid_row) => {
				(grid_row?.on_grid_fields || []).forEach((field) => {
					if (["Link", "Dynamic Link"].includes(field.df?.fieldtype)) {
						field.awesomplete?.close();
					}
				});
			});
		});
	}

	function setup_visible_columns_without_limit() {
		if (this.visible_columns?.length) {
			return;
		}

		this.user_defined_columns = [];
		this.setup_user_defined_columns();

		const use_user_columns = this.user_defined_columns.length > 0;
		const fields = use_user_columns
			? this.user_defined_columns
			: this.editable_fields || this.docfields;

		this.visible_columns = [];
		let total_colsize = 1;

		for (const field of fields) {
			const df = use_user_columns ? field : this.fields_map[field.fieldname];

			if (
				!df ||
				df.hidden ||
				(!this.editable_fields && !df.in_list_view) ||
				(this.frm && !this.frm.get_perm(df.permlevel, "read")) ||
				frappe.model.layout_fields.includes(df.fieldtype)
			) {
				continue;
			}

			if (df.columns) {
				df.colsize = df.columns;
			} else {
				this.update_default_colsize(df);
			}

			if (
				df.fieldtype === "Link" &&
				!df.formatter &&
				df.parent &&
				frappe.meta.docfield_map[df.parent]
			) {
				const docfield = frappe.meta.docfield_map[df.parent][df.fieldname];
				if (docfield?.formatter) {
					df.formatter = docfield.formatter;
				}
			}

			total_colsize += df.colsize;
			this.visible_columns.push([df, df.colsize]);
		}

		// Keep v15's normal full-width distribution when only a few columns are
		// visible. Wider configurations retain their requested widths and scroll.
		let passes = 0;
		while (total_colsize < 11 && passes < 12) {
			for (const visible_column of this.visible_columns) {
				const [df, colsize] = visible_column;
				if (
					colsize <= 1 ||
					colsize >= 11 ||
					!frappe.model.is_non_std_field(df.fieldname)
				) {
					continue;
				}

				if (
					passes < 3 &&
					["Int", "Currency", "Float", "Check", "Percent"].includes(df.fieldtype)
				) {
					continue;
				}

				visible_column[1] += 1;
				total_colsize += 1;

				if (total_colsize > 10) {
					break;
				}
			}
			passes += 1;
		}
	}
})();
