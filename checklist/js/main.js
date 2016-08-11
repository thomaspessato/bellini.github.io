function getTemplates(){
	return nunjucks.configure('template');
}

function populateChecklist(){
	var html = '',
		elemForm = document.getElementById("form-checklist"),
		templateQuestions = getTemplates();	

	fetch('manifest/checklist-01.json').then(function(response) {
		response.json().then(function(data){
			var elemChecklistName = document.getElementById("checklist-name");
			elemChecklistName.innerHTML = data.name;
			
			
			for(var i=0; i<data.checklist.length; i++){
				html += templateQuestions.render('section.html',data.checklist[i]);
			}			 

			 elemForm.innerHTML = html;
			 componentHandler.upgradeAllRegistered();			
		});
	})
}

populateChecklist();