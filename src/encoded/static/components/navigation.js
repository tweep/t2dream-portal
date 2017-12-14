'use strict';
var React = require('react');
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
var url = require('url');
var {Navbars, Navbar, Nav, NavItem} = require('../libs/bootstrap/navbar');
var {DropdownMenu, DropdownMenuSep} = require('../libs/bootstrap/dropdown-menu');
var productionHost = require('./globals').productionHost;
var _ = require('underscore');


var Navigation = module.exports = createReactClass({
    mixins: [Navbars],

    contextTypes: {
        location_href: PropTypes.string,
        portal: PropTypes.object
    },

    getInitialState: function() {
        return {
            testWarning: !productionHost[url.parse(this.context.location_href).hostname]
        };
    },

    handleClick: function(e) {
        e.preventDefault();
        e.stopPropagation();

        // Remove the warning banner because the user clicked the close icon
        this.setState({testWarning: false});

        // If collection with .sticky-header on page, jiggle scroll position
        // to force the sticky header to jump to the top of the page.
        var hdrs = document.getElementsByClassName('sticky-header');
        if (hdrs.length) {
            window.scrollBy(0,-1);
            window.scrollBy(0,1);
        }
    },

    render: function() {
        var portal = this.context.portal;
        return (
            <div id="navbar" className="navbar navbar-fixed-top navbar-inverse">
                <AmpBanner />
                <div className="container">
                    <Navbar brand="Home" brandlink="/" label="main" navClasses="navbar-main">
                        <GlobalSections />
                        <UserActions />
                        {this.props.isHomePage ? null : <ContextActions />}
                    </Navbar>
                </div>
            </div>
        );
    }
});

//AMP banner 
var AmpBanner = React.createClass({
	render: function() {
	    return (
		    <div>
		    <meta charSet="utf-8" />
		    <link href="assets/css/bootstrap.min.css" rel="stylesheet" />
		    <div className="container-fluid" style={{borderBottom: 'solid 1px #fff', backgroundImage: "url('/static/components/assets/images/AMP_banner_middle.png')", backgroundPosition: 'left top', backgroundRepeat: 'repeat-x', backgroundColor: '#397eb5',height: 70, padding: 0, minWidth: 900}}>
		    <div className="container-fluid" style={{borderBottom: 'solid 1px #fff', backgroundImage: "url('/static/components/assets/images/AMP_banner_right.png')", backgroundPosition: 'right top', backgroundRepeat: 'no-repeat', height: 70, padding: 0}}>
		    <div style={{borderBottom: 'solid 1px #fff', backgroundImage: "url('/static/components/assets/images/AMP_banner_left.png')", backgroundPosition: 'left top',backgroundRepeat: 'no-repeat', color: '#fff', padding: '15px 0 0 20px',height: 70, fontSize: 30, fontWeight: 200, letterSpacing: '0.01em'}}>
		    ACCELERATING MEDICINES PARTNERSHIP (AMP)
		    </div>
		    </div>
		    </div>
		    </div>
		    );
	}
    });



// Main navigation menus
var GlobalSections = createReactClass({
    contextTypes: {
        listActionsFor: PropTypes.func
    },

    render: function() {
        var actions = this.context.listActionsFor('global_sections').map(action => {
            return (
                <NavItem key={action.id} dropdownId={action.id} dropdownTitle={action.title}>
                    {action.children ?
                        <DropdownMenu label={action.id}>
                            {action.children.map(action => {
                                // Render any separators in the dropdown
                                if (action.id.substring(0, 4) === 'sep-') {
                                    return <DropdownMenuSep key={action.id} />;
                                }

                                // Render any regular linked items in the dropdown
                                return (
                                    <a href={action.url || ''} key={action.id}>
                                        {action.title}
                                    </a>
                                );
                            })}
                        </DropdownMenu>
                    : null}
                </NavItem>
            );
        });
        return <Nav>{actions}</Nav>;
    }
});


// Context actions: mainly for editing the current object
var ContextActions = createReactClass({
    contextTypes: {
        listActionsFor: PropTypes.func
    },

    render: function() {
        var actions = this.context.listActionsFor('context').map(function(action) {
            return (
                <a href={action.href} key={action.name}>
                    <i className="icon icon-pencil"></i> {action.title}
                </a>
            );
        });

        // No action menu
        if (actions.length === 0) {
            return null;
        }

        // Action menu with editing dropdown menu
        if (actions.length > 1) {
            return (
                <Nav right>
                    <NavItem dropdownId="context" dropdownTitle={<i className="icon icon-gear"></i>}>
                        <DropdownMenu label="context">
                            {actions}
                        </DropdownMenu>
                    </NavItem>
                </Nav>
            );
        }

        // Action menu without a dropdown menu
        return <Nav right><NavItem>{actions}</NavItem></Nav>;
    }
});



var UserActions = createReactClass({
    contextTypes: {
        listActionsFor: PropTypes.func,
        session_properties: PropTypes.object
    },

    render: function() {
        var session_properties = this.context.session_properties;
        if (!session_properties['auth.userid']) {
            // Logged out, so no user menu at all
            return null;
        }
        var actions = this.context.listActionsFor('user').map(function (action) {
            return (
                <a href={action.href || ''} key={action.id} data-bypass={action.bypass} data-trigger={action.trigger}>
                    {action.title}
                </a>
            );
        });
        var user = session_properties.user;
        var fullname = (user && user.title) || 'unknown';
        return (
            <Nav right>
                <NavItem dropdownId="useractions" dropdownTitle={fullname}>
                    <DropdownMenu label="useractions">
                        {actions}
                    </DropdownMenu>
                </NavItem>
            </Nav>
        );
    }
});


// Display breadcrumbs with contents given in 'crumbs' object.
// Each crumb in the crumbs array: {
//     id: Title string to display in each breadcrumb. If falsy, does not get included, not even as an empty breadcrumb
//     query: query string property and value, or null to display unlinked id
//     uri: Alternative to 'query' property. Specify the complete URI instead of accreting query string variables
//     tip: Text to display as part of uri tooltip.
//     wholeTip: Alternative to 'tip' property. The complete tooltip to display
// }
var Breadcrumbs = module.exports.Breadcrumbs = createReactClass({
    propTypes: {
        root: PropTypes.string, // Root URI for searches
        crumbs: PropTypes.arrayOf(PropTypes.object).isRequired // Object with breadcrumb contents
    },

    render: function() {
        var accretingQuery = '';
        var accretingTip = '';

        // Get an array of just the crumbs with something in their id
        var crumbs = _.filter(this.props.crumbs, function(crumb) { return crumb.id; });
        var rootTitle = crumbs[0].id;

        return (
            <ol className="breadcrumb">
                {crumbs.map((crumb, i) => {
                    // Build up the query string if not specified completely
                    if (!crumb.uri) {
                        accretingQuery += crumb.query ? '&' + crumb.query : '';
                    }

                    // Build up tooltip if not specified completely
                    if (!crumb.wholeTip) {
                        accretingTip += crumb.tip ? (accretingTip.length ? ' and ' : '') + crumb.tip : '';
                    }

                    // Render the breadcrumbs
                    return (
                        <li key={i}>
                            {(crumb.query || crumb.uri) ? <a href={crumb.uri ? crumb.uri : this.props.root + accretingQuery} title={crumb.wholeTip ? crumb.wholeTip : 'Search for ' + accretingTip + ' in ' + rootTitle}>{crumb.id}</a> : <span>{crumb.id}</span>}
                        </li>
                    );
                })}
            </ol>
        );
    }
});