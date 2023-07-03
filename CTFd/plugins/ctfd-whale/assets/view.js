CTFd._internal.challenge.data = undefined

CTFd._internal.challenge.renderer = CTFd.lib.markdown();

CTFd._internal.challenge.preRender = function () {
}

CTFd._internal.challenge.render = function (markdown) {
    return CTFd._internal.challenge.renderer.render(markdown)
}

CTFd._internal.challenge.postRender = function () {
    loadInfo();
}

if ($ === undefined) $ = CTFd.lib.$;

function loadInfo() {
    var challenge_id = $('#challenge-id').val();
    var url = "/api/v1/plugins/ctfd-whale/container?challenge_id=" + challenge_id;

    var params = {};

    CTFd.fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }).then(function (response) {
        if (response.status === 429) {
            // User was ratelimited but process response
            return response.json();
        }
        if (response.status === 403) {
            // User is not logged in or CTF is paused.
            return response.json();
        }
        return response.json();
    }).then(function (response) {
        if (window.t !== undefined) {
            clearInterval(window.t);
            window.t = undefined;
        }
        if (response.success) response = response.data;
        else CTFd.ui.ezq.ezAlert({
            title: "Fail",
            body: response.message,
            button: "OK"
        });
        if (response.remaining_time === undefined) {
            $('#whale-panel').html('<div class="card" style="width: 100%;">' +
                '<div class="card-body">' +
                '<h5 class="card-title">实例信息</h5>' +
                '<button type="button" class="btn btn-primary card-link" id="whale-button-boot" ' +
                '        onclick="CTFd._internal.challenge.boot()">' +
                '启动题目实例' +
                '</button>' +
                '</div>' +
                '</div>');
        } else {
            if (response.user_access.includes(":0"))
            {
                $('#whale-panel').html('<div class="card" style="width: 100%;">' +
                    '<div class="card-body">' +
                    '<h5 class="card-title">实例信息</h5>' +
                    '<button type="button" class="btn btn-primary card-link" id="whale-button-boot">' +
                    '正在启动容器，请等待。。。' +
                    '</button>' +
                    '</div>' +
                    '</div>');
                $('#whale-button-boot')[0].disabled = true;
                setTimeout(loadInfo,2000)
            }
            else
            {
                $('#whale-panel').html(
                    `<div class="card" style="width: 100%;">
                    <div class="card-body">
                        <h5 class="card-title">实例信息</h5>
                        <h6 class="card-subtitle mb-2 text-muted" id="whale-challenge-count-down">
                            剩余时间: ${response.remaining_time}秒
                        </h6>
                        <h6 class="card-subtitle mb-2 text-muted">
                            局域网域: ${response.lan_domain}
                        </h6>
                        <a id="user-access" class="card-text" target="_blank" href=""></a><br/><br/>
                        <button type="button" class="btn btn-danger card-link" id="whale-button-destroy"
                                onclick="CTFd._internal.challenge.destroy()">
                            关闭实例容器
                        </button>
                        <button type="button" class="btn btn-success card-link" id="whale-button-renew"
                                onclick="CTFd._internal.challenge.renew()">
                            延期实例容器
                        </button>
                    </div>
                </div>`
                );
                $('#user-access').html(response.user_access);
                function showAuto() {
                    const c = $('#whale-challenge-count-down')[0];
                    if (c === undefined) return;
                    const origin = c.innerHTML;
                    const second = parseInt(origin.split(": ")[1].split('s')[0]) - 1;
                    c.innerHTML = '剩余时间: ' + second + '秒';
                    if (second < 0) {
                        loadInfo();
                    }
                }
                window.t = setInterval(showAuto, 1000);

                var port = response.user_access.split(':');
                var host = document.location.host.split(':')[0];
                document.getElementById("user-access").href="http://"+host+":"+port[1];
            }
        }
    });
};

CTFd._internal.challenge.destroy = function () {
    var challenge_id = $('#challenge-id').val();
    var url = "/api/v1/plugins/ctfd-whale/container?challenge_id=" + challenge_id;

    $('#whale-button-destroy')[0].innerHTML = "正在关闭容器，请等待。。。";
    $('#whale-button-destroy')[0].disabled = true;

    var params = {};

    CTFd.fetch(url, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    }).then(function (response) {
        if (response.status === 429) {
            // User was ratelimited but process response
            return response.json();
        }
        if (response.status === 403) {
            // User is not logged in or CTF is paused.
            return response.json();
        }
        return response.json();
    }).then(function (response) {
        if (response.success) {
            loadInfo();
            CTFd.ui.ezq.ezAlert({
                title: "操作成功",
                body: "你的容器实例已被关闭!",
                button: "OK"
            });
        } else {
            $('#whale-button-destroy')[0].innerHTML = "关闭实例容器";
            $('#whale-button-destroy')[0].disabled = false;
            CTFd.ui.ezq.ezAlert({
                title: "操作失败失败",
                body: response.message,
                button: "OK"
            });
        }
    });
};

CTFd._internal.challenge.renew = function () {
    var challenge_id = $('#challenge-id').val();
    var url = "/api/v1/plugins/ctfd-whale/container?challenge_id=" + challenge_id;

    $('#whale-button-renew')[0].innerHTML = "正在请求延期容器，请等待。。。";
    $('#whale-button-renew')[0].disabled = true;

    var params = {};

    CTFd.fetch(url, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    }).then(function (response) {
        if (response.status === 429) {
            // User was ratelimited but process response
            return response.json();
        }
        if (response.status === 403) {
            // User is not logged in or CTF is paused.
            return response.json();
        }
        return response.json();
    }).then(function (response) {
        if (response.success) {
            loadInfo();
            CTFd.ui.ezq.ezAlert({
                title: "延期成功",
                body: "你的实例容器已延期!",
                button: "OK"
            });
        } else {
            $('#whale-button-renew')[0].innerHTML = "Renew this instance";
            $('#whale-button-renew')[0].disabled = false;
            CTFd.ui.ezq.ezAlert({
                title: "延期失败",
                body: response.message,
                button: "OK"
            });
        }
    });
};

CTFd._internal.challenge.boot = function () {
    var challenge_id = $('#challenge-id').val();
    var url = "/api/v1/plugins/ctfd-whale/container?challenge_id=" + challenge_id;

    $('#whale-button-boot')[0].innerHTML = "正在启动容器，请等待。。。";
    $('#whale-button-boot')[0].disabled = true;

    var params = {};

    CTFd.fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    }).then(function (response) {
        if (response.status === 429) {
            // User was ratelimited but process response
            return response.json();
        }
        if (response.status === 403) {
            // User is not logged in or CTF is paused.
            return response.json();
        }
        return response.json();
    }).then(function (response) {
        if (response.success) {
            loadInfo();
            CTFd.ui.ezq.ezAlert({
                title: "启动成功",
                body: "你的实例容器已成功部署!",
                button: "OK"
            });
        } else {
            $('#whale-button-boot')[0].innerHTML = "Launch an instance";
            $('#whale-button-boot')[0].disabled = false;
            CTFd.ui.ezq.ezAlert({
                title: "启动失败",
                body: response.message,
                button: "OK"
            });
        }
    });
};


CTFd._internal.challenge.submit = function (preview) {
    var challenge_id = $('#challenge-id').val();
    var submission = $('#challenge-input').val()

    var body = {
        'challenge_id': challenge_id,
        'submission': submission,
    }
    var params = {}
    if (preview)
        params['preview'] = true

    return CTFd.api.post_challenge_attempt(params, body).then(function (response) {
        if (response.status === 429) {
            // User was ratelimited but process response
            return response
        }
        if (response.status === 403) {
            // User is not logged in or CTF is paused.
            return response
        }
        return response
    })
};
