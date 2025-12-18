import shared_kcl.v2.defs as v2

_playground_subdomain = "openai-playground"

v2.Service {
    internal_service_name = "openai-api-playground"
    exposures = [
        v2.ExposureMapping {
            from = v2.ServiceInternalConfig {
                port = 3000
            }
            to = v2.ServiceExternalConfig {
                subdomain = _playground_subdomain
                use_tls = True
                allow_ips = v2.ALLOW_IPS.ALL
                require_auth = True
            }
        }
    ]
    homepage = v2.HomepageConfig {
        group = "Development"
        name = "OpenAI API Playground"
        icon = "mdi-api"
        description = "Playground app for OpenAI APIs"
    }
}

