(function(){
	Date.prototype.yyyymmdd = function() {
	  var mm = this.getMonth() + 1; // getMonth() is zero-based
	  var dd = this.getDate();

	  return [this.getFullYear(), [!mm[1] && '0', mm,].join(''), [!dd[1] && '0', dd].join('') ].join('-');
	};

	Date.prototype.HHmm = function() {
		var d = new Date();
		datetext = d.toTimeString();
		datetext = datetext.split(' ')[0];
		datetext = datetext.split(':');

		return datetext[0]+ ':' +datetext[1];
	};

	var PRIVATE = {};
	PRIVATE.elemForm = document.getElementById("form-checklist");
	PRIVATE.elemQuestionCount = document.getElementById("question-count");
	PRIVATE.questionList = [];

	PRIVATE.NunjucksModule = function() {
		// we customize nunjucks a little
		var nunTags= {
				tags: {
					blockStart: '{%',
					blockEnd: '%}',
					variableStart: '{{',
					variableEnd: '}}',
					commentStart: '<!--',
					commentEnd: '-->'
				}
			};

		// and use our own loader, so require.js will not start crying
		var NunLoader = nunjucks.Loader.extend({
			async: false,
			getSource: function(name){
				return { src: name };
			}
		});

		var replaceAccents = function (str) {
			return str
				.replace(/[Ã¡Ã Ã£Ã¢Ã¤]/ig,'a')
				.replace(/[Ã©Ã¨ÃªÃ«]/ig,'e')
				.replace(/[Ã­Ã¬Ã®Ã¯]/ig,'i')
				.replace(/[Ã³Ã²ÃµÃ´Ã¶]/ig,'o')
				.replace(/[ÃºÃ¹Ã»Ã¼]/ig,'u')
				.replace(/[Ã§]/ig,'c');
		};

		/**
		 * This class manages the templates within Apps, Components, etc.
		 *
		 * Apps and components treat their templates using TemplateManager
		 * automatically, although you can use it manually if you will.
		 *
		 * You'll have a reference to it inside "setup" and "init" of Apps and Comps
		 * if they are using templates. Its the __shared.dependencies.temaplteManager object.
		 *
		 * It can also be required by it's id "mod.templateManager" (as any other component)
		 *
		 * Once you have access to it, run
		 *
		 * ```javascript
		 * var tm = new TemplateManager(yourDIctionary, someReference);
		 * tm.create('template1', "template string");
		 * tm.create('template2', "template string");
		 * tm.create('template3', "template string");
		 * var r = tm.render('template2', {});
		 * ```
		 *
		 * @pkg  mod.templateManager
		 * @class templateManager
		 * @namespace mod
		 */
		return function TemplateManager(dict, ref) {

			var templates= {},
				rawTemplates= {},
				dictionary= dict;

			// we use a special environment from NunJucks
			var env= new nunjucks.Environment(new NunLoader(), nunTags);

			// the reference is so you can use it as your scope
			this.ref= ref;
			this.dictionary= dictionary;

			// this method simply sets some references for further use
			this.setReferences= function(n, e, d){
				var filters= this.filters;
				nun= n;
				env= e;
				dictionary= d;

				// lets just set some references here
				this.engine= env;

				// adding filters to be used within templates
				for(var i in filters){
					if(typeof filters[i] == 'function'){
						this.engine.addFilter(i, filters[i]);
					}
				}
			};

			// we do this to have ES6 variable syntax working too ( ${var} )
			function fixVariableSyntax (str) {
				return str.replace(/\$\{([^\}]*)\}/ig, "{{$1}}");
			}

			/**
			 * Creates a new template to be used, referenced by its ID.
			 *
			 * @param tplName {String} The template ID.
			 * @param tplString {String} The template string itself.
			 */
			this.create= function(tplName, tplString){

				var i = null,
					tpl= null;

				if(typeof tplName == 'string'){
					// retrocompatibility with ES6 template format and default nunjucks
					tplString= fixVariableSyntax(tplString);
					/// then we store the new template and its raw string
					templates[tplName]= new nunjucks.Template(tplString, env, env);
					rawTemplates[tplName]= tplString;
				}else{
					// you can create a list of templates
					for(i in tplName){
						// and here we create all the templates at once
						if(typeof tplName[i] == 'string'){
							// also applying the new syntax
							tplName[i]= fixVariableSyntax(tplName[i]);
							// and storing the templates and its raw version
							templates[i]= new nunjucks.Template(tplName[i], env, env);
							rawTemplates[i]= tplName[i];
						}else{
							// or, in case it already is a templateObject
							// we simply store it
							templates[i]= tplName[i];
							rawTemplates[i]= tplName[i].tmplStr;
						}
					}
				}
			};

			/**
			 * Gets the string from the given template, or undefined.
			 *
			 * @method get
			 * @param {String} templateName
			 * @return {String}
			 */
			this.get= function(tplName){
				return templates[tplName] || false;
			};

			/**
			 * Renders the given template, binding the data object passed
			 * as second argument.
			 * It also binds the dictionary values for l10n markups.
			 *
			 * @method render
			 * @param {String} templateName
			 * @param {Object} [dataBinding]
			 * @param {Function} [callback]
			 * @return {DOMFragment}
			 */
			this.render= function(tplName, tplBinding){

				var tpl= templates[tplName] || tplName,
					tplStr= rawTemplates[tplName],
					df,
					wc,
					tmpName= '',
					TmpComp= null,
					tmpParams= [],
					params= {},
					componentList= {},
					componentsPromises = [],
					callback = typeof arguments[arguments.length -1] == 'function' ? arguments[arguments.length -1] : null;

				 // let's firstly, render from NunJucks
				tpl= env.render(tplStr, Object.assign( {}, rawTemplates, (tplBinding || {}) ) );

				// dealing with l10n and dictionaries
				// here, when we see the marks of %term, the l10n is applied
				if(this.ref && this.ref.l10n){
					tpl= this.ref.l10n.format(tpl);
				}else if(this.dictionary){
					tpl= this.dictionary.format(tpl);
				}



				return tpl;
			};

			/**
			 * Returns a list with the registered templates.
			 *
			 * @method list
			 * @return {Array}
			 */
			this.list= function(){
				return templates;
			};

			/**
			 * The list of available filters to be used in marups
			 * within templates.
			 *
			 * To use such filters, you can use on your templates like this:
			 * ${val | filter1 | filter2(arg) }
			 *
			 * Besides the default filters, we created some new ones. They are:
			 *
			 * - maxLen(limit) : truncates a string to that given size
			 * - ceil : rounds numbers to its next round value(eg: 1.3 becomes 2)
			 * - floor : rounds numbers to its previous round value(eg: 1.9 becomes 1)
			 * - numberFormat(decimalLengh, thousandSeparator, decimalSeparator) : Formats number values
			 * - pad(length, placeHolder, type) : fills a string using placeHolder(eg: "abc"|pad(5, "X") becomes "abcXX")
			 * - focus(match) : Adds <strong> and </strong> to matched strings, inside the variable
			 *
			 * @property filters
			 */
			this.filters= {
				maxLen: function(str, len){
					return str.substring(0, len||undefined);
				},
				ceil: function(val){
					return Math.ceil(val);
				},
				floor: function(val){
					return Math.floor(val);
				},
				/* jshint ignore:start */
				numberFormat: function(value, decPlaces, thouSeparator, decSeparator) {
					var n = value,
					decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces,
					decSeparator = decSeparator == undefined ? "." : decSeparator,
					thouSeparator = thouSeparator == undefined ? "," : thouSeparator,
					sign = n < 0 ? "-" : "",
					i = parseInt(n = Math.abs(+n || 0).toFixed(decPlaces)) + "",
					j = (j = i.length) > 3 ? j % 3 : 0;
					return sign + (j ? i.substr(0, j) + thouSeparator : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thouSeparator) + (decPlaces ? decSeparator + Math.abs(n - i).toFixed(decPlaces).slice(2) : "");
				},
				/* jshint ignore:end */
				pad: function(value, length, placeholder, type){
					return (""+value).pad(length, placeholder, type);
				},

				focus: function(value, match) {
					var strValue = replaceAccents(value);
					var strMatch = replaceAccents(match);
					var matchIndex = strValue.toLowerCase().indexOf(strMatch.toLowerCase());
					if(matchIndex >= 0){
						var end = match.length;
						return value.replace(value.substr(matchIndex, end), '<strong>'+value.substr(matchIndex, end)+'</strong>');
					}
				}
			};

			/**
			 * It is the nunjucks engine itself.
			 * You can use it to call any method straight from nunjucks
			 * API.
			 *
			 * @property engine
			 */
			if(env){
				this.setReferences(nunjucks, env);
			}

			return this;
		};
	};

	function getTemplates(){
		var templatesString = {
			question : '<div class="mdl-card question-section"><div class="mdl-card__supporting-text question-name">{{ sectionIndex + loop.index }}) {{ item.name }}?</div><div class="mdl-card__actions"><label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="option-{{ sectionIndex + loop.index0 }}1"><input type="radio" id="option-{{ sectionIndex + loop.index0 }}1" class="mdl-radio__button" name="question-{{ sectionIndex + loop.index0 }}" value="Conforme"><span class="mdl-radio__label ">C</span></label><label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="option-{{ sectionIndex + loop.index0 }}2"><input type="radio" id="option-{{ sectionIndex + loop.index0 }}2" class="mdl-radio__button" name="question-{{ sectionIndex + loop.index0 }}" value="NC"><span class="mdl-radio__label ">NC</span></label><label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="option-{{ sectionIndex + loop.index0 }}3"><input type="radio" id="option-{{ sectionIndex + loop.index0 }}3" class="mdl-radio__button" name="question-{{ sectionIndex + loop.index0 }}" value="NA"><span class="mdl-radio__label ">NA</span></label><div style="display:block; margin-top:10px;"><div id="wrapper-image-{{ sectionIndex + loop.index0 }}"></div><button type="button" style="display:block; margin-top:10px;" class="add-image" data-id="{{ sectionIndex + loop.index0 }}">Adicionar Foto</button></div><div class="mdl-textfield mdl-js-textfield" style="display:block;"><textarea class="mdl-textfield__input" placeholder="Obs" type="text" rows= "3" id="question-obs-{{ sectionIndex + loop.index0 }}" name="question-obs-{{ sectionIndex + loop.index0 }}"></textarea></div></div></div>',
			section : '<section class="section--center mdl-grid mdl-shadow--2dp" id="{{ label }}"><h5 class="title">{{ sectionName }}</h5>{% for item in questions %}{% include question %}{% endfor %}</section>',
			info : '<section class="section--center mdl-grid mdl-shadow--2dp" id="section-info"><h5 class="title">Dados do Estabelecimento</h5><label class="mdl-textfield mdl-js-textfield" for="store-name"><span class="mdl-radio__label ">Nome:</span><br><select name="store-name" class="mdl-textfield__input" id="store-name"><option value="">...</option><option value="Bocattino Novo Hamburgo">Bocattino Novo Hamburgo</option><option value="Bocattino Bourbom Country">Bocattino Bourbom Country</option><option value="Bocattino Bourbom Walling">Bocattino Bourbom Walling</option><option value="Bocattino Iguatemi">Bocattino Iguatemi</option><option value="Bocattino Barra">Bocattino Barra</option><option value="Bocattino Canoas">Bocattino Canoas</option><option value="Bocattino Pelotas">Bocattino Pelotas</option><option value="Bocattino São Leopoldo">Bocattino São Leopoldo</option><option value="Belgaleto Boulevard">Belgaleto Boulevard</option><option value="Belgaleto Ipiranga">Belgaleto Ipiranga</option><option value="Belgaleto Aeroporto">Belgaleto Aeroporto</option><option value="Bocattino Box Trend">Bocattino Box Trend</option><option value="Bocattino Box Unisinos">Bocattino Box Unisinos</option></select></label><label class="mdl-textfield mdl-js-textfield" for="checklist-visit"><span class="mdl-radio__label ">Visita:</span><br><select name="checklist-visit" class="mdl-textfield__input" id="checklist-visit"><option value="">...</option><option value="1">1</option><option value="2">2</option></select></label><div class="mdl-textfield mdl-js-textfield"><span class="mdl-radio__label ">Responsável:</span><input class="mdl-textfield__input" type="text" name="store-responsible" placeholder="..."></div><div class="mdl-textfield mdl-js-textfield"><span class="mdl-radio__label ">Alvará:</span><input class="mdl-textfield__input" type="text" name="store-charter" placeholder="..."></div><div class="mdl-textfield mdl-js-textfield"><span class="mdl-radio__label ">Data:</span><input class="mdl-textfield__input" type="date" name="checklist-date" placeholder="Data"></div><div class="mdl-textfield mdl-js-textfield"><span class="mdl-radio__label ">Hora:</span><input class="mdl-textfield__input" type="time" name="checklist-hour" placeholder="Data"></div><h5 class="title">Observações Gerais</h5><div class="mdl-textfield mdl-js-textfield"><textarea class="mdl-textfield__input" name="checklist-obs" placeholder="..."></textarea></div></section>'
		}

		var temp = new PRIVATE.NunjucksModule();
		var templates = new temp();

		for(var x in templatesString){
			templates.create(x, templatesString[x]);
		}

		return templates;
	}

	function populateChecklist(){
		var html,
			templateQuestions = getTemplates();

		html = templateQuestions.render('info',{});

		fetch('manifest/checklist-01.json').then(function(response) {
			response.json().then(function(data){
				var htmlNavSections = "",
					elemChecklistName = document.getElementById("checklist-name"),
					elemNavSections = document.getElementById("nav-sections");

				elemChecklistName.innerHTML = data.name;

				var sectionIndex = 0;

				for(var i=0; i<data.checklist.length; i++){
					data.checklist[i].sectionIndex = sectionIndex;
					html += templateQuestions.render('section',data.checklist[i]);
					sectionIndex += data.checklist[i].questions.length;
					htmlNavSections += '<a class="mdl-navigation__link" href="#'+ data.checklist[i].label +'">'+ data.checklist[i].sectionName +'</a>';
				}

				elemNavSections.innerHTML = htmlNavSections;
				PRIVATE.questionLength = sectionIndex;
				PRIVATE.elemQuestionCount.innerHTML = "0/" + sectionIndex;

				PRIVATE.elemForm.innerHTML = html + '<div class="wrapper-button"><button class="mdl-button mdl-js-button mdl-button--raised">Enviar</button></div><br><br><br><div class="wrapper-button"><button class="mdl-button mdl-js-button mdl-button--raised" type="reset" onclick="location.hash = \'\';location.hash=\'section-info\'">Limpar</button><br><br><br></div>';
				PRIVATE.setStoreInfo();
				bindEvents();
			});
		})
	}

	PRIVATE.setStoreInfo = function(){
		PRIVATE.elemSectionInfo = document.getElementById("section-info");

		var date = new Date();
		PRIVATE.elemSectionInfo.querySelector('input[name="checklist-date"]').value = date.yyyymmdd('-');
		PRIVATE.elemSectionInfo.querySelector('input[name="checklist-hour"]').value = date.HHmm('-');
	};

	PRIVATE.getDateTime = function(){
		var date = PRIVATE.elemSectionInfo.querySelector('input[name="checklist-date"]').value.split('-');

		return date[2] +'/'+ date[1] +'/'+ date[0] +' '+ PRIVATE.elemSectionInfo.querySelector('input[name="checklist-hour"]').value;
	};

	PRIVATE.checkQuestionStatus = function(){
		var count = 0;
		PRIVATE.elemQuestionWithoutAwnser = null;

		for(var i=0; i<PRIVATE.elemQuestions.length; i++){
			if(PRIVATE.elemQuestions[i].querySelector('input[name="question-'+ i +'"]:checked')){
				count++;
			}else if(!PRIVATE.elemQuestionWithoutAwnser){
				PRIVATE.elemQuestionWithoutAwnser = PRIVATE.elemQuestions[i];
			}
		}

		PRIVATE.elemQuestionCount.innerHTML = count + "/" + PRIVATE.questionLength;
	};

	function bindEvents(){
		PRIVATE.elemQuestions = document.querySelectorAll('.question-section');

		PRIVATE.elemQuestionCount.addEventListener("click", function(evt){
			PRIVATE.checkQuestionStatus();
			PRIVATE.elemQuestionWithoutAwnser.scrollIntoView({block: "end", behavior: "smooth"});
		});

		//Form submit
		PRIVATE.elemForm.addEventListener("submit", function(evt){
			evt.preventDefault();

			var obs, anwser, imgs;

			PRIVATE.imagePromises = []; //reset promises;

			for(var i=0; i<PRIVATE.elemQuestions.length; i++){

				anwser = PRIVATE.elemQuestions[i].querySelector('input[name="question-'+ i +'"]:checked');
				obs = PRIVATE.elemQuestions[i].querySelector('textarea[name="question-obs-'+ i +'"]');
				imgs = PRIVATE.elemQuestions[i].querySelectorAll('input[type=file]');


				PRIVATE.questionList[i] = {
					id : i,
					name : PRIVATE.elemQuestions[i].querySelector('.question-name').textContent,
					value : anwser && anwser.value || '',
					obs : obs && obs.value || '',
					image : null
				};

				if(!PRIVATE.questionList[i].image){
					PRIVATE.questionList[i].image = [];
					for(var j=0; j<imgs.length; j++){
						if(imgs[j].value){
							readURL(imgs[j], i);
						}
					}
				}
			}

			buildPdf();
		});

		//Add click count
		PRIVATE.elemForm.addEventListener("click", function(elem){
			PRIVATE.checkQuestionStatus();
		});

		// Add new image
		var elemAddImage = PRIVATE.elemForm.querySelectorAll('.add-image');
		for(var i=0; i<elemAddImage.length; i++){
			elemAddImage[i].addEventListener("click", function(evt){
				var questionID = evt.target.dataset.id,
					elemWrapperImage = document.getElementById('wrapper-image-'+ questionID);

				evt.target.dataset.sequence = evt.target.dataset.sequence || 0;

				if(elemWrapperImage){
					var file = document.createElement('input');
					file.setAttribute("style", "display:block; margin-top:5px");
					file.setAttribute("type", "file");
					file.setAttribute("name", "question-image-"+ questionID + '-' + evt.target.dataset.sequence);
					file.setAttribute("accept", 'image/*;capture=camera');

					elemWrapperImage.appendChild(file);

					evt.target.dataset.sequence = parseInt(evt.target.dataset.sequence) + 1;
				}
			});
		}
	}

	function readURL(input, index) {
		PRIVATE.imagePromises.push(new Promise(function(resolve, reject) {
			if(input && input.files && input.files.length > 0){
				var reader = new FileReader();
				reader.readAsDataURL(input.files[0]);
				reader.onload = function (e) {
					PRIVATE.questionList[index].image.push(e.target.result);
					resolve();
				};
			}
		}));
	}

	populateChecklist();

	PRIVATE.getTextImage = function(name){
		var imgs = {
			"logoboca" : "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QkgRXhpZgAASUkqAAgAAAAFAA4BAgAZAAAASgAAADEBAgAYAAAAZAAAAGmHBAABAAAAuggAAJucAQAyAAAAfAAAABzqBwAMCAAArgAAAAAAAABsb2dvbWFyY2EgQm9jYXR0aW5vXzIwMTEA/0Fkb2JlIElsbHVzdHJhdG9yIENTNS4xAGwAbwBnAG8AbQBhAHIAYwBhACAAQgBvAGMAYQB0AHQAaQBuAG8AXwAyADAAMQAxAAAAHOoAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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igAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8L+LPiCbUfEY0eJj9mssZUfxykZJ/AED8/WvUPBPhmHwx4fht9g+1ygSXL9y+OmfQdB/9evHPFcX9m/FC4e93eT9tSdiecxkhuPw4/CvoVGV0VlYMpAIIPBFZx3bPOwq5605y3Rj+LbpbPwjq07EDFrIBn1KkD9SK8S8OazP4e8F65dW7FJ76aK0icfw4V2Yj6A/gSK7P4v+JYUsI/D9vIGmlZZLkKfuqOVU+5OD+HuK5rxD4cn0r4YaJMyMGe4aacehkX5c+mFVR9aJPXQyxU3Ko3D7K/M0PhH4Yiv7ybXbtA6Wr7LdWGR5mMlvwBGPc57V7RXB/COe3k8FrFER5sU7iUd8k5B/Ij8q6jxDrlr4e0afULphtjX5EzgyP2Ue5/8Ar1UdEdeFUadBS+Z5JrT/ANqfG+BIjkRXkC+v3Apb9Qa9vFeKfCrT59Y8XXmv3PzeRucv/elkzn9C35ivbKUe5OCTcZTfVhRRRVnaFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAcf448CweLbdJopFg1GFSscpHysOu1u+M9+2TXnYt/iZodt/ZkAvjbqNqeUqygDttbBIH4ivdKKlxuctTCxnLmTafkeOeEfhnqN3qi6r4lUrGG8zyJH3yTN1+frx655Ner6lptrq2mzWF7EJLeZdrKf5j0IPNXKKaikXSw8KceVdTxO58FeMPBuoy3Hhueae2f+KEruI7B4zwSPUA/hnFUT4X8deMb9Dqq3Cop/1l38iRjvhB/QV71RU8iMHgYPS7t2Mnw5oFp4a0aLTrTJVPmeQjmRj1Y/56ACtaiirOyMVFWQUUUUFBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH/9k="
		};

		return imgs[name];
	};

	function buildPdf(){
		Promise.all(PRIVATE.imagePromises).then(function() {
			var i, posImageCount = 0,
				imageWith = 300,
				imageHeight = 145,
				posImage, posDoc = 10, text, doc = new jsPDF('p', 'pt');

			var lastPage = doc.internal.pages.length;

			function calcPagination(margin, objHeight){
				if(doc.internal.pages.length == lastPage){
					posDoc += margin + objHeight;

					//console.log('----------->' + posDoc);

					if(posDoc >= doc.internal.pageSize.height){
						doc.addPage();
						//console.log('-----------> NEW PAGE');
						posDoc = 40 + objHeight;
					}
				}else{
					//console.log('-----------> PAGE CREATE');
					posDoc = doc.autoTableEndPosY() + objHeight;
				}

				lastPage = doc.internal.pages.length;

				return posDoc - objHeight;

			}

			//Logo
			doc.addImage(PRIVATE.getTextImage('logoboca'), 'JPEG', 20, 20, 75, 0);
			//Texto portaria
			doc.text("CHECKLIST - PORTARIA 78/2009", 160, 40);

			//********************************************
			// Infos da empresa
			//********************************************
			var storeName = PRIVATE.elemSectionInfo.querySelector('select[name="store-name"]').value,
				checklistVisit = PRIVATE.elemSectionInfo.querySelector('select[name="checklist-visit"]').value,
				checklistObs = PRIVATE.elemSectionInfo.querySelector('textarea[name="checklist-obs"]').value;

			var storeInfo = [
				{name : "EMPRESA",  value : storeName},
				{name : "VISITA",  value : checklistVisit},
				{name : "ALVARA" , value : PRIVATE.elemSectionInfo.querySelector('input[name="store-charter"]').value},
				{name : "RESPONSÁVEL" , value : PRIVATE.elemSectionInfo.querySelector('input[name="store-responsible"]').value},
				{name : "DATA/HORA" , value : PRIVATE.getDateTime()}
			];

			doc.autoTable(getColumnsInfo(), storeInfo, {
				margin: {horizontal: 20},
				startY: 65,
				theme: 'grid'
			});

			//Update position
			calcPagination(doc.autoTableEndPosY(),0);

			doc.setFontSize(10);
			doc.setTextColor(255, 255, 255);
			doc.setFontType("bold");
			doc.text("IDENTIFICAÇÃO", 250, 80);


			//********************************************
			//Tabela com as perguntas
			//********************************************
			doc.autoTable(getColumns(), PRIVATE.questionList, {
				margin: {horizontal: 20},
				startY: calcPagination(10,0),
				theme: 'grid'
			});

			//Update position
			calcPagination(doc.autoTableEndPosY(),0);

			doc.setTextColor(0);
			doc.setFontSize(10);
			doc.setFontType("normal");
			doc.text("NC = Não Conforme:", 20, calcPagination(20,0));
			doc.text("NA = Não avaliado/ Não se aplica:", 20, calcPagination(12,0));


			//********************************************
			//Pontuacao
			//********************************************
			var countC = 0, countNA = 0, points;
			for(i=0; i<PRIVATE.questionList.length; i++){
				if(PRIVATE.questionList[i].value == 'Conforme'){
					countC++;
				}else if(PRIVATE.questionList[i].value == 'NA'){
					countNA++;
				}
			}

			points = (countC / (PRIVATE.questionList.length - countNA)) * 100;

			if(points < 70){
				doc.setTextColor(255, 0, 0); //red
			}else if(points >= 70 && points < 90){
				doc.setTextColor(255, 204, 0); //yelow
			}else{
				doc.setTextColor(51, 204, 51); //green
			}

			doc.setFontSize(18);
			doc.setFontType("bold");
			doc.text("Avaliação Final: " + points.toFixed(2) + "%" , 20, calcPagination(30,0));


			//********************************************
			//Observações Gerais
			//********************************************
			if(checklistObs != ""){
				doc.setTextColor(0);
				doc.setFontSize(14);
				doc.setFontType("bold");
				doc.text("Observações Gerais:", 20, calcPagination(30,0));

				doc.setFontType("normal");
				doc.setFontSize(10);
				text = doc.splitTextToSize(checklistObs, doc.internal.pageSize.width - 40, {});
				doc.text(text, 20, calcPagination(15, text.length * 12));
			}


			//********************************************
			//Imagens em anexo
			//********************************************
			doc.setTextColor(0);
			doc.setFontSize(14);
			doc.setFontType("bold");
			doc.text("Fotos referentes a visita:", 20, calcPagination(20, 15));

			doc.setFontType("normal");
			doc.setFontSize(10);

			for(i=0; i<PRIVATE.questionList.length; i++){
				if(PRIVATE.questionList[i].image && PRIVATE.questionList[i].image.length > 0) {
					text = doc.splitTextToSize(PRIVATE.questionList[i].name, doc.internal.pageSize.width - 40, {});
					doc.text(text, 20, calcPagination(10, text.length * 12));

					for(var j=0; j<PRIVATE.questionList[i].image.length; j++){
						doc.addImage(PRIVATE.questionList[i].image[j], 'JPEG', 20, calcPagination(10, imageHeight), imageWith, imageHeight);
					}

					//add margin
					calcPagination(30,0);
				}
			}

			doc.save(storeName + '-' + checklistVisit + '.pdf');
		}, function() {

		});
	}

	// Returns a new array each time to avoid pointer issues
	var getColumns = function () {
		return [
			//{title: "", dataKey: "id"},
			{title: "Perguntas", dataKey: "name"},
			{title: "Resposta", dataKey: "value"},
			{title: "Obs", dataKey: "obs"}
		];
	};

	// Returns a new array each time to avoid pointer issues
	var getColumnsInfo = function () {
		return [
			{title: "", dataKey: "name"},
			{title: "", dataKey: "value"}
		];
	};

})();