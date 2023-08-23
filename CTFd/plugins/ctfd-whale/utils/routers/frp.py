import warnings

from flask import current_app, request
from requests import session, RequestException

from CTFd.models import db
from CTFd.utils import get_config, set_config, logging

from .base import BaseRouter
from ..cache import CacheProvider
from ..db import DBContainer
from ..exceptions import WhaleError, WhaleWarning
from ...models import WhaleContainer


class FrpRouter(BaseRouter):
    name = "frp"
    types = {
        'direct': 'tcp',
        'http': 'http',
    }

    class FrpRule:
        def __init__(self, name, config):
            self.name = name
            self.config = config

        def __str__(self) -> str:
            return f'[{self.name}]\n' + '\n'.join(f'{k} = {v}' for k, v in self.config.items())

    def __init__(self):
        super().__init__()
        self.ses = session()
        self.url = get_config("whale:frp_api_url").rstrip("/")
        self.common = ''
        try:
            CacheProvider(app=current_app).init_port_sets()
        except Exception:
            warnings.warn(
                "cache initialization failed",
                WhaleWarning
            )

    def reload(self):
        rules = []
        for container in DBContainer.get_all_alive_container():
            name = f'{container.challenge.redirect_type}_{container.user_id}_{container.uuid}'
            config = {
                'type': self.types[container.challenge.redirect_type],
                'local_ip': f'{container.user_id}-{container.uuid}',
                'local_port': container.challenge.redirect_port,
                'use_compression': 'true',
            }
            if config['type'] == 'http':
                config['subdomain'] = container.http_subdomain
            elif config['type'] == 'tcp':
                config['remote_port'] = container.port
            rules.append(self.FrpRule(name, config))

        try:
            if not self.common:
                common = get_config("whale:frp_config_template", '')
                if '[common]' in common:
                    self.common = common
                else:
                    remote = self.ses.get(f'{self.url}/api/config')
                    assert remote.status_code == 200
                    set_config("whale:frp_config_template", remote.text)
                    self.common = remote.text
            config = self.common + '\n' + '\n'.join(str(r) for r in rules)
            assert self.ses.put(
                f'{self.url}/api/config', config, timeout=5
            ).status_code == 200
            assert self.ses.get(
                f'{self.url}/api/reload', timeout=5
            ).status_code == 200
        except (RequestException, AssertionError) as e:
            raise WhaleError(
                '\nfrpc request failed\n' +
                (f'{e}\n' if str(e) else '') +
                'please check the frp related configs'
            ) from None

    def access(self, container: WhaleContainer):
        language = "zh"
        try:
            language = request.cookies.get("Scr1wCTFdLanguage", "zh")
        except:
            pass
        if container.challenge.redirect_type == 'direct':
            return f'{get_config("whale:frp_direct_ip_address", "127.0.0.1")}:{container.port}'
        elif container.challenge.redirect_type == 'http':
            host = get_config("whale:frp_http_domain_suffix", "")
            port = get_config("whale:frp_http_port", "80")
            host += f':{port}' if port != 80 else ''
            if language == "zh":
                return f'<a target="_blank" href="http://{container.http_subdomain}.{host}/">题目链接</a>'
            else:
                return f'<a target="_blank" href="http://{container.http_subdomain}.{host}/">Instance Link</a>'
        return ''

    def register(self, container: WhaleContainer):
        language = "zh"
        try:
            language = request.cookies.get("Scr1wCTFdLanguage", "zh")
        except:
            pass
        if container.challenge.redirect_type == 'direct':
            if not container.port:
                port = CacheProvider(app=current_app).get_available_port()
                if not port:
                    if language == "zh":
                        return False, 'No available ports. Please wait for a few minutes.'
                    else:
                        return False, '没有可用的端口。 请稍等几分钟。'
                container.port = port
                db.session.commit()
        elif container.challenge.redirect_type == 'http':
            # config['subdomain'] = container.http_subdomain
            pass
        self.reload()
        return True, 'success'

    def unregister(self, container: WhaleContainer):
        language = "zh"
        try:
            language = request.cookies.get("Scr1wCTFdLanguage", "zh")
        except:
            pass
        if container.challenge.redirect_type == 'direct':
            try:
                redis_util = CacheProvider(app=current_app)
                redis_util.add_available_port(container.port)
            except Exception as e:
                logging.log_simple(
                    'whale', '[CTFd Whale] 从缓存中删除端口时出错'
                )
                if language == "zh":
                    return False, '从缓存中删除端口时出错'
                else:
                    return False, 'Error deleting port from cache'
        self.reload()
        return True, 'success'

    def check_availability(self):
        language = "zh"
        try:
            language = request.cookies.get("Scr1wCTFdLanguage", "zh")
        except:
            pass
        try:
            resp = self.ses.get(f'{self.url}/api/status')
        except RequestException as e:
            if language == "zh":
                return False, '无法访问 frpc 管理 api'
            else:
                return False, 'Unable to access frpc admin api'
        if resp.status_code == 401:
            if language == "zh":
                return False, 'frpc admin api 认证失败'
            else:
                return False, 'frpc admin api unauthorized'
        return True, 'Available'
