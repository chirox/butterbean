window.butterbean = window.butterbean || {};

( function() {

	// Bail if we don't have the JSON, which is passed in via `wp_localize_script()`.
	if ( _.isUndefined( butterbean_data ) ) {
		return;
	}

	/* === Backbone + Underscore === */

	// Our global object (`butterbean`).
	var api = butterbean = { managers : {}, sections : {}, controls : {} };

	// Templates.
	var templates = { managers : {}, sections : {}, controls : {} };

	// Nav template.
	var nav_template = wp.template( 'butterbean-nav' );

	/* === Models === */

	// Manager model (each manager is housed within a meta box).
	var Manager = Backbone.Model.extend( {
		defaults : {
			name     : '',
			type     : '',
			sections : {},
			controls : {}
		}
	} );

	// Section model (each section belongs to a manager).
	var Section = Backbone.Model.extend( {
		defaults : {
			name        : '',
			type        : '',
			label       : '',
			description : '',
			icon        : '',
			manager     : '',
			active      : '',
			selected    : false
		}
	} );

	// Control model (each control belongs to a manager and section).
	var Control = Backbone.Model.extend( {
		defaults : {
			name        : '',
			type        : '',
			label       : '',
			description : '',
			icon        : '',
			value       : '',
			choices     : {},
			attr        : '',
			active      : '',
			manager     : '',
			section     : '',
			setting     : ''
		}
	} );

	/* === Collections === */

	// Collection of sections.
	var Sections = Backbone.Collection.extend( {
		model : Section
	} );

	/* === Views === */

	// Manager view.  Handles the output of a manager.
	api.managers.default = Backbone.View.extend( {
		tagName : 'div',
		attributes : function() {
			return {
				'id'    : 'butterbean-manager-' + this.model.get( 'name' ),
				'class' : 'butterbean-manager butterbean-manager-' + this.model.get( 'type' )
			};
		},
		initialize : function() {

			var type = this.model.get( 'type' );

			if ( _.isUndefined( templates.managers[ type ] ) ) {
				templates.managers[ type ] = wp.template( 'butterbean-manager-' + type );
			}

			this.template = templates.managers[ type ];
		},
		render : function() {
			this.el.innerHTML = this.template( this.model.toJSON() );
			return this;
		},
		subview_render : function() {

			// Create a new section collection.
			var sections = new Sections();

			// Loop through each section and add it to the collection.
			_.each( this.model.get( 'sections' ), function( data ) {

				sections.add( new Section( data ) );
			} );

			// Loop through each section in the collection and render its view.
			sections.forEach( function( section, i ) {

				// Create a new nav item view for the section.
				var nav_view = new Nav_View( { model : section } );

				// Render the nav item view.
				document.querySelector( '#butterbean-ui-' + section.get( 'manager' ) + ' .butterbean-nav'     ).appendChild( nav_view.render().el     );

				// Get the section view callback.
				var callback = _.isUndefined( api.sections[ section.type ] ) ? api.sections.default : api.sections[ section.type ];

				// Create a new section view.
				var view = new callback( { model : section } );

				// Render the section view.
				document.querySelector( '#butterbean-ui-' + section.get( 'manager' ) + ' .butterbean-content' ).appendChild( view.render().el );

				// Call the section view's ready method.
				view.ready();

				// If the first model, set it to selected.
				section.set( 'selected', 0 === i );
			}, this );

			// Loop through each control for the manager and render its view.
			_.each( this.model.get( 'controls' ), function( data ) {

				// Create a new control model.
				var control = new Control( data );

				// Get the control view callback.
				var callback = _.isUndefined( api.controls[ data.type ] ) ? api.controls.default : api.controls[ data.type ];

				// Create a new control view.
				var view = new callback( { model : control } );

				// Render the view.
				document.getElementById( 'butterbean-' + control.get( 'manager' ) + '-section-' + control.get( 'section' ) ).appendChild( view.render().el );

				// Call the view's ready method.
				view.ready();
			} );

			return this;
		}
	} );

	// Section view.  Handles the output of a section.
	api.sections.default = Backbone.View.extend( {
		tagName : 'div',
		attributes : function() {
			return {
				'id'          : 'butterbean-' + this.model.get( 'manager' ) + '-section-' + this.model.get( 'name' ),
				'class'       : 'butterbean-section butterbean-section-' + this.model.get( 'type' ),
				'aria-hidden' : ! this.model.get( 'selected' )
			};
		},
		initialize : function() {
			this.model.on('change', this.onchange, this);

			var type = this.model.get( 'type' );

			if ( _.isUndefined( templates.sections[ type ] ) ) {
				templates.sections[ type ] = wp.template( 'butterbean-section-' + type );
			}

			this.template = templates.sections[ type ];
		},
		render : function() {

			// Only render template if model is active.
			if ( this.model.get( 'active' ) ) {
				this.el.innerHTML = this.template( this.model.toJSON() );
			}

			return this;
		},
		onchange : function() {

			// Set the view's `aria-hidden` attribute based on whether the model is selected.
			this.el.setAttribute( 'aria-hidden', ! this.model.get( 'selected' ) );
		},
		ready : function() {}
	} );

	// Nav view.
	var Nav_View = Backbone.View.extend( {
		template : nav_template,
		tagName : 'li',
		attributes : function() {
			return {
				'aria-selected' : this.model.get( 'selected' )
			};
		},
		initialize : function() {
			this.model.on('change', this.render, this);
			this.model.on('change', this.onchange, this);
		},
		render : function() {

			// Only render template if model is active.
			if ( this.model.get( 'active' ) ) {
				this.el.innerHTML = this.template( this.model.toJSON() );
			}

			return this;
		},
		events : {
			'click a' : 'onselect'
		},
		onchange : function() {

			// Set the `aria-selected` attibute based on the model selected state.
			this.el.setAttribute( 'aria-selected', this.model.get( 'selected' ) );
		},
		onselect : function( event ) {
			event.preventDefault();

			// Loop through each of the models in the collection and set them to inactive.
			_.each( this.model.collection.models, function( m ) {

				m.set( 'selected', false );
			}, this );

			// Set this view's model to selected.
			this.model.set( 'selected', true );
		}
	} );

	// Control view. Handles the output of a control.
	api.controls.default = Backbone.View.extend( {
		tagName : 'div',
		attributes : function() {
			return {
				'id'    : 'butterbean-control-' + this.model.get( 'name' ),
				'class' : 'butterbean-control butterbean-control-' + this.model.get( 'type' )
			};
		},
		initialize : function() {
			var type = this.model.get( 'type' );

			// Only add a new control template if we have a different control type.
			if ( _.isUndefined( templates.controls[ type ] ) ) {
				templates.controls[ type ] = wp.template( 'butterbean-control-' + type );
			}

			this.template = templates.controls[ type ];

			_.bindAll( this, 'render' );
			this.model.bind( 'change', this.render );
		},
		render : function() {

			// Only render template if model is active.
			if ( this.model.get( 'active' ) ) {
				this.el.innerHTML = this.template( this.model.toJSON() );
			}

			return this;
		},
		ready : function() {}
	} );

	// Palette control view.
	api.controls.palette = api.controls.default.extend( {
		events : {
			'change input' : 'onselect'
		},
		onselect : function() {

			var value = document.querySelector( '#' + this.el.id + ' input:checked' ).getAttribute( 'value' );

			var choices = this.model.get( 'choices' );

			_.each( choices, function( choice, key ) {
				choice.selected = key === value;
			} );

			this.model.set( 'choices', choices ).trigger( 'change', this.model );
		}
	} );

	// Image control view.
	api.controls.image = api.controls.default.extend( {
		events : {
			'click .butterbean-add-media'    : 'showmodal',
			'click .butterbean-change-media' : 'showmodal',
			'click .butterbean-remove-media' : 'removemedia'
		},
		showmodal : function() {

			if ( ! _.isUndefined( this.modal ) ) {

				this.modal.open();
				return;
			}

			this.modal = wp.media( {
				frame    : 'select',
				multiple : false,
				editing  : true,
				title    : this.model.get( 'l10n' ).choose,
				library  : { type : 'image' },
				button   : { text:  this.model.get( 'l10n' ).set }
			} );

			this.modal.on( 'select', function() {

				var media = this.modal.state().get( 'selection' ).first().toJSON();

				this.model.set( {
					src   : media.sizes.large ? media.sizes.large.url : media.url,
					alt   : media.alt,
					value : media.id
				} );
			}, this );

			this.modal.open();
		},
		removemedia : function() {

			this.model.set( { src : '', alt : '', value : '' } );
		}
	} );

	// Wait until the document has loaded until we render.
	if ( typeof document.addEventListener !== 'undefined' )
		document.addEventListener( 'DOMContentLoaded', render, false );

	else if ( typeof window.attachEvent !== 'undefined' )
		window.attachEvent( 'onload', render );

	/**
	 * Renders our managers, sections, and controls.
	 *
	 * @since  1.0.0
	 * @access private
	 * return void
	 */
	function render() {

		// Loop through each of the managers and render their api.views.
		_.each( butterbean_data.managers, function( data ) {

			// Create a new manager model.
			var manager = new Manager( data );

			// Create a new manager view.
			var view = new api.managers.default( { model : manager } );

			// Add the `.butterbean-ui` class to the meta box.
			document.getElementById( 'butterbean-ui-' + manager.get( 'name' ) ).className += ' butterbean-ui';

			// Render the manager view.
			document.querySelector( '#butterbean-ui-' + manager.get( 'name' ) + ' .inside' ).appendChild( view.render().el );

			// Render the manager subapi.views.
			view.subview_render();
		} );
	}
}() );
