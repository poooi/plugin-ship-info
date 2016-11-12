
window.resolveTime = (t)=>t;

window.remote = require('electron').remote;
window._ = require('lodash');
window.$ = (param) => document.querySelector(param);
window.React = require('react');
window.ReactDOM = require('react-dom');
window.FontAwesome = require('react-fontawesome');
window.ReactBootstrap = require('react-bootstrap');

//load theme
$('#bootstrap-css').setAttribute('href', `file://${require.resolve('bootstrap/dist/css/bootstrap.css')}`)

//workaround for Input
const React = window.React
const {Radio, Checkbox, FormControl} = window.ReactBootstrap

window.ReactBootstrap.Input = class extends window.React.Component {
  render() {
    switch (this.props.type) {
    case 'radio': {
      return (
        <Radio {...this.props}>{this.props.label}</Radio>
      )
    }
    case 'checkbox': {
      return (
        <Checkbox {...this.props}>{this.props.label}</Checkbox>
      )
    }
    case 'select': {
      return (
        <FormControl componentClass='select' {...this.props}>{this.props.children}</FormControl>
      )
    }
    default: {
      return (
        <FormControl {...this.props}>{this.props.children}</FormControl>
      )
    }
    }
  }
}

//a fake cnfig
var configData = {};
window.config = {
	get: function(path, value){
		var ret = configData[path];
		if (ret === undefined ){
			this.set(path,value);
			return value;
		}else{
			return ret;
		}

	},
	set: function(path, value){
		configData[path] = value;
	}
}
