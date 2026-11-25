/**
 * GENERATED FILE — do not hand-edit. Regenerate with `npm run generate:api-types`.
 * Source: http://localhost:5080/openapi/v1.json
 */

export interface paths {
  '/api/v{version}/categories': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          Search?: string;
        };
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfIReadOnlyListOfCategoryResponse'];
            'application/json': components['schemas']['ApiResponseOfIReadOnlyListOfCategoryResponse'];
            'text/json': components['schemas']['ApiResponseOfIReadOnlyListOfCategoryResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['CreateCategoryCommand'];
          'text/json': components['schemas']['CreateCategoryCommand'];
          'application/*+json': components['schemas']['CreateCategoryCommand'];
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfCategoryResponse'];
            'application/json': components['schemas']['ApiResponseOfCategoryResponse'];
            'text/json': components['schemas']['ApiResponseOfCategoryResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/categories/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfCategoryResponse'];
            'application/json': components['schemas']['ApiResponseOfCategoryResponse'];
            'text/json': components['schemas']['ApiResponseOfCategoryResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    put: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['UpdateCategoryCommand'];
          'text/json': components['schemas']['UpdateCategoryCommand'];
          'application/*+json': components['schemas']['UpdateCategoryCommand'];
        };
      };
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfCategoryResponse'];
            'application/json': components['schemas']['ApiResponseOfCategoryResponse'];
            'text/json': components['schemas']['ApiResponseOfCategoryResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    post?: never;
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description No Content */
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/clients': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          /** @description Trecho do nome, do e-mail ou do CPF do cliente, com ou sem máscara. Ignora maiúsculas e minúsculas. Ausente, vazio ou somente espaços não aplica filtro. Limite de 254 caracteres após remover espaços nas extremidades. */
          Search?: string;
          /** @description Situação do cliente: active (somente ativos), inactive (somente inativos) ou all (todos). Ausente lista todos. */
          Status?: 'active' | 'inactive' | 'all';
          /** @description Página dos resultados, começando em 1. Padrão: 1. */
          Page?: number;
          /** @description Quantidade de itens por página, entre 1 e 100. Padrão: 20. */
          PageSize?: number;
        };
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfPagedResultOfClientListItemResponse'];
            'application/json': components['schemas']['ApiResponseOfPagedResultOfClientListItemResponse'];
            'text/json': components['schemas']['ApiResponseOfPagedResultOfClientListItemResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['CreateClientCommand'];
          'text/json': components['schemas']['CreateClientCommand'];
          'application/*+json': components['schemas']['CreateClientCommand'];
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfClientResponse'];
            'application/json': components['schemas']['ApiResponseOfClientResponse'];
            'text/json': components['schemas']['ApiResponseOfClientResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/clients/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfClientResponse'];
            'application/json': components['schemas']['ApiResponseOfClientResponse'];
            'text/json': components['schemas']['ApiResponseOfClientResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    put: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['UpdateClientCommand'];
          'text/json': components['schemas']['UpdateClientCommand'];
          'application/*+json': components['schemas']['UpdateClientCommand'];
        };
      };
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfClientResponse'];
            'application/json': components['schemas']['ApiResponseOfClientResponse'];
            'text/json': components['schemas']['ApiResponseOfClientResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    post?: never;
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description No Content */
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/clients/{id}/deactivate': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfClientResponse'];
            'application/json': components['schemas']['ApiResponseOfClientResponse'];
            'text/json': components['schemas']['ApiResponseOfClientResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/clients/{id}/reactivate': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfClientResponse'];
            'application/json': components['schemas']['ApiResponseOfClientResponse'];
            'text/json': components['schemas']['ApiResponseOfClientResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/services': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          Search?: string;
          CategoryId?: string;
          TagId?: string;
          /** @description Página dos resultados, começando em 1. Padrão: 1. */
          Page?: number;
          /** @description Quantidade de itens por página, entre 1 e 100. Padrão: 20. */
          PageSize?: number;
        };
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfPagedResultOfServiceResponse'];
            'application/json': components['schemas']['ApiResponseOfPagedResultOfServiceResponse'];
            'text/json': components['schemas']['ApiResponseOfPagedResultOfServiceResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['CreateServiceCommand'];
          'text/json': components['schemas']['CreateServiceCommand'];
          'application/*+json': components['schemas']['CreateServiceCommand'];
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfServiceResponse'];
            'application/json': components['schemas']['ApiResponseOfServiceResponse'];
            'text/json': components['schemas']['ApiResponseOfServiceResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/services/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['UpdateServiceCommand'];
          'text/json': components['schemas']['UpdateServiceCommand'];
          'application/*+json': components['schemas']['UpdateServiceCommand'];
        };
      };
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfServiceResponse'];
            'application/json': components['schemas']['ApiResponseOfServiceResponse'];
            'text/json': components['schemas']['ApiResponseOfServiceResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    post?: never;
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description No Content */
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/tags': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          /** @description Trecho do nome da etiqueta. Ignora maiúsculas e minúsculas. Ausente, vazio ou somente espaços não aplica filtro. Limite de 254 caracteres após remover espaços nas extremidades. */
          Search?: string;
          /** @description Página dos resultados, começando em 1. Padrão: 1. */
          Page?: number;
          /** @description Quantidade de itens por página, entre 1 e 100. Padrão: 20. */
          PageSize?: number;
        };
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfPagedResultOfTagResponse'];
            'application/json': components['schemas']['ApiResponseOfPagedResultOfTagResponse'];
            'text/json': components['schemas']['ApiResponseOfPagedResultOfTagResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['CreateTagCommand'];
          'text/json': components['schemas']['CreateTagCommand'];
          'application/*+json': components['schemas']['CreateTagCommand'];
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfTagResponse'];
            'application/json': components['schemas']['ApiResponseOfTagResponse'];
            'text/json': components['schemas']['ApiResponseOfTagResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v{version}/tags/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfTagResponse'];
            'application/json': components['schemas']['ApiResponseOfTagResponse'];
            'text/json': components['schemas']['ApiResponseOfTagResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    put: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          'application/json': components['schemas']['UpdateTagCommand'];
          'text/json': components['schemas']['UpdateTagCommand'];
          'application/*+json': components['schemas']['UpdateTagCommand'];
        };
      };
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiResponseOfTagResponse'];
            'application/json': components['schemas']['ApiResponseOfTagResponse'];
            'text/json': components['schemas']['ApiResponseOfTagResponse'];
          };
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    post?: never;
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
          version: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description No Content */
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
        /** @description Bad Request */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Forbidden */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Conflict */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ApiProblemDetails'];
            'application/json': components['schemas']['ApiProblemDetails'];
            'text/json': components['schemas']['ApiProblemDetails'];
          };
        };
        /** @description Internal Server Error */
        500: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/problem+json': components['schemas']['ApiProblemDetails'];
          };
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    ApiProblemDetails: {
      type?: null | string;
      title?: null | string;
      /** Format: int32 */
      status?: null | number;
      detail?: null | string;
      instance?: null | string;
      code?: null | string;
      traceId?: null | string;
      correlationId?: null | string;
      errors?: null | {
        [key: string]: components['schemas']['FieldError'][];
      };
    };
    ApiResponseOfCategoryResponse: {
      data: null | components['schemas']['CategoryResponse'];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    ApiResponseOfClientResponse: {
      data: null | components['schemas']['ClientResponse'];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    ApiResponseOfIReadOnlyListOfCategoryResponse: {
      data: null | components['schemas']['CategoryResponse'][];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    ApiResponseOfPagedResultOfClientListItemResponse: {
      data: null | components['schemas']['PagedResultOfClientListItemResponse'];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    ApiResponseOfPagedResultOfServiceResponse: {
      data: null | components['schemas']['PagedResultOfServiceResponse'];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    ApiResponseOfPagedResultOfTagResponse: {
      data: null | components['schemas']['PagedResultOfTagResponse'];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    ApiResponseOfServiceResponse: {
      data: null | components['schemas']['ServiceResponse'];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    ApiResponseOfTagResponse: {
      data: null | components['schemas']['TagResponse'];
      success?: boolean;
      /** Format: date-time */
      timestamp?: string;
      traceId?: null | string;
      correlationId?: null | string;
    };
    CategoryResponse: {
      /** Format: uuid */
      id: string;
      name: string;
    };
    ClientListItemResponse: {
      /** Format: uuid */
      id: string;
      fullName: string;
      /** Format: date */
      birthDate: null | Date;
      phone: null | string;
      email: null | string;
      cpf: null | string;
      status: components['schemas']['ClientStatus'];
      tags: components['schemas']['TagSummary'][];
    };
    ClientResponse: {
      /** Format: uuid */
      id: string;
      fullName: string;
      /** Format: date */
      birthDate: null | Date;
      phone: null | string;
      email: null | string;
      cpf: null | string;
      administrativeNotes: null | string;
      status: components['schemas']['ClientStatus'];
      guardians: components['schemas']['GuardianResponse'][];
      referenceContacts: components['schemas']['ReferenceContactResponse'][];
      tags: components['schemas']['TagSummary'][];
    };
    /** @enum {unknown} */
    ClientStatus: 'active' | 'inactive';
    /** @enum {unknown} */
    ContactPurpose: 'emergency' | 'operationalSupport' | 'dailyCommunication';
    CreateCategoryCommand: {
      name: string;
    };
    CreateClientCommand: {
      /** @description Nome completo do cliente, de 2 a 150 caracteres. */
      fullName: string;
      /**
       * Format: date
       * @description Data de nascimento no formato AAAA-MM-DD, no passado e com até 120 anos. Menores de 18 anos exigem ao menos um responsável. Omita se não souber.
       */
      birthDate?: null | Date;
      /** @description Telefone com até 20 caracteres, só dígitos, espaços, +, parênteses e hífen, com ao menos um dígito. Omita se não houver. */
      phone?: null | string;
      /** @description E-mail com até 254 caracteres. Não pode já estar em uso por outro cliente ativo. Omita se não houver. */
      email?: null | string;
      /** @description CPF com 11 dígitos válidos, com ou sem pontos e hífen. Não pode já estar cadastrado. Omita se não houver. */
      cpf?: null | string;
      /** @description Observações administrativas internas, com até 500 caracteres. Omita se não houver. */
      administrativeNotes?: null | string;
      /** @description Responsáveis pelo cliente, até 10. Obrigatório ao menos um para menores de 18 anos. Omita se não houver. */
      guardians?: null | components['schemas']['GuardianInput'][];
      /** @description Pessoas de referência do cliente, até 10, cada uma com ao menos uma finalidade. Omita se não houver. */
      referenceContacts?: null | components['schemas']['ReferenceContactInput'][];
      /** @description IDs das etiquetas do cliente, até 20 e sem repetição. Omita se não houver. */
      tagIds?: null | string[];
    };
    CreateServiceCommand: {
      name: string;
      description: null | string;
      /** Format: int32 */
      durationMinutes: number;
      /** Format: int32 */
      minDurationMinutes: number;
      /** Format: int32 */
      maxDurationMinutes: number;
      /** Format: double */
      price: number;
      /** Format: double */
      maxDiscountPercentage: number;
      /** Format: uuid */
      categoryId: null | string;
      tagIds: null | string[];
    };
    CreateTagCommand: {
      name: string;
      color: string;
      description?: null | string;
    };
    FieldError: {
      code?: string;
      message?: string;
      meta?: null | {
        [key: string]: string;
      };
    };
    GuardianInput: {
      /** @description Nome do responsável, de 2 a 150 caracteres. */
      name: string;
      /** @description Vínculo do responsável com o cliente, como mãe, pai ou tutor, com até 60 caracteres. */
      relationship: string;
      /** @description Telefone do responsável, no mesmo formato do telefone do cliente. Omita se não houver. */
      phone?: null | string;
      /** @description CPF do responsável, no mesmo formato do CPF do cliente. Omita se não houver. */
      cpf?: null | string;
    };
    GuardianResponse: {
      /** Format: uuid */
      id: string;
      name: string;
      relationship: string;
      phone: null | string;
      cpf: null | string;
    };
    PagedResultOfClientListItemResponse: {
      items: components['schemas']['ClientListItemResponse'][];
      /** Format: int32 */
      totalCount: number;
      /** Format: int32 */
      page: number;
      /** Format: int32 */
      pageSize: number;
    };
    PagedResultOfServiceResponse: {
      items: components['schemas']['ServiceResponse'][];
      /** Format: int32 */
      totalCount: number;
      /** Format: int32 */
      page: number;
      /** Format: int32 */
      pageSize: number;
    };
    PagedResultOfTagResponse: {
      items: components['schemas']['TagResponse'][];
      /** Format: int32 */
      totalCount: number;
      /** Format: int32 */
      page: number;
      /** Format: int32 */
      pageSize: number;
    };
    ReferenceContactInput: {
      /** @description Nome da pessoa de referência, de 2 a 150 caracteres. */
      name: string;
      /** @description Vínculo da pessoa de referência com o cliente, com até 60 caracteres. */
      relationship: string;
      /** @description Finalidades do contato, ao menos uma: emergency (emergência), operationalSupport (apoio operacional) ou dailyCommunication (comunicação diária). */
      purposes: null | components['schemas']['ContactPurpose'][];
      /** @description Telefone da pessoa de referência, no mesmo formato do telefone do cliente. Omita se não houver. */
      phone?: null | string;
    };
    ReferenceContactResponse: {
      /** Format: uuid */
      id: string;
      name: string;
      relationship: string;
      phone: null | string;
      purposes: components['schemas']['ContactPurpose'][];
    };
    ServiceResponse: {
      /** Format: uuid */
      id: string;
      /** Format: int32 */
      code: number;
      name: string;
      description: null | string;
      /** Format: int32 */
      durationMinutes: number;
      /** Format: int32 */
      minDurationMinutes: number;
      /** Format: int32 */
      maxDurationMinutes: number;
      /** Format: double */
      price: number;
      /** Format: double */
      maxDiscountPercentage: number;
      /** Format: uuid */
      categoryId: null | string;
      categoryName: null | string;
      tags: components['schemas']['TagSummary'][];
    };
    TagResponse: {
      /** Format: uuid */
      id: string;
      name: string;
      color: string;
      description: null | string;
    };
    TagSummary: {
      /** Format: uuid */
      id: string;
      name: string;
      color: string;
    };
    UpdateCategoryCommand: {
      /** Format: uuid */
      categoryId: string;
      name: string;
    };
    UpdateClientCommand: {
      /**
       * Format: uuid
       * @description ID do cliente a editar, em formato UUID. Use o valor do campo id do cliente.
       */
      clientId: string;
      /** @description Nome completo final do cliente, de 2 a 150 caracteres. */
      fullName: string;
      /**
       * Format: date
       * @description Data de nascimento final no formato AAAA-MM-DD, no passado e com até 120 anos. Menores de 18 anos exigem ao menos um responsável. Envie null para ficar sem data.
       */
      birthDate: null | Date;
      /** @description Telefone final com até 20 caracteres, só dígitos, espaços, +, parênteses e hífen, com ao menos um dígito. Envie null para ficar sem telefone. */
      phone: null | string;
      /** @description E-mail final com até 254 caracteres. Não pode já estar em uso por outro cliente ativo. Envie null para ficar sem e-mail. */
      email: null | string;
      /** @description CPF final com 11 dígitos válidos, com ou sem pontos e hífen. Não pode já estar cadastrado em outro cliente. Envie null para ficar sem CPF. */
      cpf: null | string;
      /** @description Observações administrativas internas finais, com até 500 caracteres. Envie null para ficar sem observações. */
      administrativeNotes: null | string;
      /** @description Lista final de responsáveis, até 10. Substitui a lista atual: envie todos os que devem permanecer. Envie null ou lista vazia para remover todos. Obrigatório ao menos um para menores de 18 anos. */
      guardians: null | components['schemas']['UpdateGuardianInput'][];
      /** @description Lista final de pessoas de referência, até 10, cada uma com ao menos uma finalidade. Substitui a lista atual: envie todas as que devem permanecer. Envie null ou lista vazia para remover todas. */
      referenceContacts: null | components['schemas']['UpdateReferenceContactInput'][];
      /** @description Lista final de IDs de etiquetas, até 20 e sem repetição. Substitui a lista atual: envie todas as que devem permanecer. Envie null ou lista vazia para remover todas. */
      tagIds: null | string[];
    };
    UpdateGuardianInput: {
      /** @description Nome do responsável, de 2 a 150 caracteres. */
      name: string;
      /** @description Vínculo do responsável com o cliente, como mãe, pai ou tutor, com até 60 caracteres. */
      relationship: string;
      /** @description Telefone do responsável, no mesmo formato do telefone do cliente. Envie null se não houver. */
      phone: null | string;
      /** @description CPF do responsável, no mesmo formato do CPF do cliente. Envie null se não houver. */
      cpf: null | string;
    };
    UpdateReferenceContactInput: {
      /** @description Nome da pessoa de referência, de 2 a 150 caracteres. */
      name: string;
      /** @description Vínculo da pessoa de referência com o cliente, com até 60 caracteres. */
      relationship: string;
      /** @description Telefone da pessoa de referência, no mesmo formato do telefone do cliente. Envie null se não houver. */
      phone: null | string;
      /** @description Finalidades do contato, ao menos uma: emergency (emergência), operationalSupport (apoio operacional) ou dailyCommunication (comunicação diária). */
      purposes: null | components['schemas']['ContactPurpose'][];
    };
    UpdateServiceCommand: {
      /** Format: uuid */
      serviceId: string;
      name: string;
      description: null | string;
      /** Format: int32 */
      durationMinutes: number;
      /** Format: int32 */
      minDurationMinutes: number;
      /** Format: int32 */
      maxDurationMinutes: number;
      /** Format: double */
      price: number;
      /** Format: double */
      maxDiscountPercentage: number;
      /** Format: uuid */
      categoryId: null | string;
      tagIds: null | string[];
    };
    UpdateTagCommand: {
      /** Format: uuid */
      tagId: string;
      name: string;
      color: string;
      description: null | string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
