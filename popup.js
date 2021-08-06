const btnCopy = document.getElementById('btn-copy');
const btnPaste = document.getElementById('btn-paste');

const label = document.getElementById('label');

let currentTab = null;

/**
 * setup new variable elements on page by local storage variable object
 */
function writeScheduleData()
{

    /**
     *
     * @param type
     * @param key
     * @param value
     * @returns {string}
     */
    function getVariableRowTemplate(
        type,
        key,
        value
    ) {
        return `<div class="ci-variable-row-body border-bottom">
            <input class="js-ci-variable-input-id" name="schedule[variables_attributes][][id]" type="hidden" value="">
            <input class="js-ci-variable-input-destroy" name="schedule[variables_attributes][][_destroy]" type="hidden">
            <select class="js-ci-variable-input-variable-type ci-variable-body-item form-control select-control custom-select table-section section-15" 
                name="schedule[variables_attributes][][variable_type]"
            >
                <option value="env_var"` + (type === 'env_var' ? ' selected' : '') + `>Variable</option>
                <option value="file"` + (type === 'file' ? ' selected' : '') + `>File</option>
            </select>
            <input class="js-ci-variable-input-key ci-variable-body-item qa-ci-variable-input-key form-control gl-form-input table-section section-15" 
                name="schedule[variables_attributes][][key]" placeholder="Input variable key" type="text"
                value="`+ key +`"><p class="gl-field-error hidden">This field is required.</p>
            <div class="ci-variable-body-item gl-show-field-errors table-section section-15 border-top-0 p-0">
            <div class="form-control js-secret-value-placeholder qa-ci-variable-input-value overflow-hidden hide">
                *****************
            </div>
            <textarea class="js-ci-variable-input-value js-secret-value qa-ci-variable-input-value form-control gl-form-input" name="schedule[variables_attributes][][secret_value]" placeholder="Input variable value" rows="1"
            >`+ value +`</textarea>
            <p class="masking-validation-error gl-field-error hide" style="display: none;">
                Cannot use Masked Variable with current value
                <a target="_blank" rel="noopener noreferrer" href="/help/ci/variables/README#mask-a-cicd-variable">
                ?</a>
            </p>
        </div>
        <button aria-label="Remove variable row" class="gl-button btn btn-default btn-icon js-row-remove-button ci-variable-row-remove-button table-section" type="button">
            x
        </button>
        </div>`;
    }

    chrome.storage.local.get(
        'variables',
        (result) => {
            let list = document.getElementsByClassName('ci-variable-list').item(0);
            let variables = JSON.parse(result.variables);

            for (let i = 0; i < variables.length; i++) {
                let row = document.createElement('li');
                row.classList.add('js-row', 'ci-variable-row');
                row.innerHTML = getVariableRowTemplate(
                    variables[i].type,
                    variables[i].key,
                    variables[i].value,
                );
                row.setAttribute('data-is-persisted','false');

                list.appendChild(row);
            }
        }
    );
}

/**
 * open new schedule page tab via stored createuri in chrome local storage
 */
function openNewSchedule()
{
    chrome.storage.local.get(
        'createUri',
        (result) => {
            let createUri = result.createUri;

            chrome.tabs.create(
                {
                    url: createUri
                }
            );
        }
    );
}

/**
 * handle variables result and safe into chrome local storage, open new schedule page
 * @param result
 */
function getVariablesResult(result)
{
    let variables = result[0].result;
    chrome.storage.local.set(
        {
            'variables': JSON.stringify(variables)
        }
    );

    openNewSchedule();
}

/**
 * fetch variables from site elements and return as object
 */
function getVariables()
{
    let variables = [];

    const inputKeys = document.getElementsByName('schedule[variables_attributes][][key]');
    const inputTypes = document.getElementsByName('schedule[variables_attributes][][variable_type]');
    const inputValues = document.getElementsByName('schedule[variables_attributes][][secret_value]');

    for (let i = 0; i < inputKeys.length; i++) {
        if (inputKeys.item(i).value.length > 0) {
            variables.push(
                {
                    type: inputTypes.item(i).value,
                    key: inputKeys.item(i).value,
                    value: inputValues.item(i).textContent
                }
            );
        }
    }

    return variables;
}

/**
 * check result if we are on schedule edit page and set creation uri for new, add btn listener
 * @param result
 */
function checkForCopyableScheduleResult(result)
{
    let createUri = result[0].result;
    if (createUri !== false) {
        chrome.storage.local.set(
            {
                'createUri' : createUri
            }
        );

        btnCopy.classList.remove('disabled');
        btnCopy.addEventListener(
            'click',
            () => {
                chrome.scripting.executeScript(
                    {
                        target: {
                            tabId: currentTab.id,
                        },
                        function: getVariables
                    },
                    getVariablesResult
                )
            }
        );
    }
}

/**
 * check wether we are on schedule edit page
 * @returns {string|boolean}
 */
function checkForCopyableSchedule()
{
    let uri = document.documentURI;
    if (uri.indexOf('pipeline_schedules') > -1) {
        uri = uri.split('/');

        if (uri[uri.length - 1] === 'edit') {
            uri.pop();
            uri.pop();
        } else if (uri[uri.length -1 ] === 'new') {
            uri.pop();
        }

        if (document.getElementsByClassName('ci-variable-list').length === 1) {
            return uri.join('/') + '/new';
        }
    }
    return false;
}

/**
 * check if we are on new schedule and have copied variables, set btn listener for writing variables into new
 *
 * @param result
 */
function checkForNewScheduleResult(result)
{
    chrome.storage.local.get(
        'variables',
        (vars) => {
            if (result[0].result === true) {
                if (vars.variables !== undefined) {
                    label.innerText = Object.keys(
                        JSON.parse(vars.variables)
                    ).length + ' copied variables';

                    btnPaste.classList.remove('disabled');

                    btnPaste.addEventListener(
                        'click',
                        () => {
                            chrome.scripting.executeScript(
                                {
                                    target: {
                                        tabId: currentTab.id,
                                    },
                                    function: writeScheduleData
                                }
                            );
                        }
                    );
                } else {
                    label.innerText = 'no copied variables';
                }
            }
        }
    );
}

/**
 * check wether we are on new schedule page
 */
function checkForNewSchedule()
{

    let uri = document.documentURI;
    if (uri.indexOf('pipeline_schedules') > -1) {
        if (document.getElementsByClassName('ci-variable-list').length === 1) {
            return true;
        }
    }
    return false;
}

/**
 * open popup entry
 */
(async () => {
    let [tab] = await chrome.tabs.query(
        {
            active: true,
            currentWindow: true
        }
    );
    currentTab = tab;

    chrome.scripting.executeScript(
        {
            target: {
                tabId: currentTab.id
            },
            function: checkForCopyableSchedule,
        },
        checkForCopyableScheduleResult
    );

    chrome.scripting.executeScript(
        {
            target: {
                tabId: currentTab.id
            },
            function: checkForNewSchedule
        },
        checkForNewScheduleResult
    )
})();