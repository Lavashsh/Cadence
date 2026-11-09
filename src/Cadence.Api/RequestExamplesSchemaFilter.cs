using Cadence.Application.Contracts;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Cadence.Api;

public sealed class RequestExamplesSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        var type = context.Type;
        if (type == typeof(RegisterRequest) || type == typeof(LoginRequest))
        {
            Example(schema, "email", "user@example.com");
            Example(schema, "password", "Cadence123");
        }
        else if (type == typeof(CreateBoardRequest) || type == typeof(UpdateBoardRequest))
        {
            Example(schema, "name", "Команда");
            Example(schema, "description", "1234");
        }
        else if (type == typeof(CreateColumnRequest) || type == typeof(UpdateColumnRequest))
            Example(schema, "name", "В работе");
        else if (type == typeof(CreateTaskRequest) || type == typeof(UpdateTaskRequest))
        {
            Example(schema, "title", "Подготовить макет");
            Example(schema, "description", "1234");
        }
        else if (type == typeof(AddMemberRequest))
            Example(schema, "role", "Editor");
    }

    private static void Example(OpenApiSchema schema, string property, string value)
    {
        if (schema.Properties.TryGetValue(property, out var propertySchema))
            propertySchema.Example = new OpenApiString(value);
    }
}
