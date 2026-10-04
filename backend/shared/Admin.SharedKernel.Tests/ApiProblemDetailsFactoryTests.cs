using Admin.SharedKernel.AspNetCore;

namespace Admin.SharedKernel.Tests;

public class ApiProblemDetailsFactoryTests
{
    [Theory]
    [InlineData("Name", "name")]
    [InlineData("MaxDurationMinutes", "maxDurationMinutes")]
    [InlineData("Guardians", "guardians")]
    [InlineData("Guardians[0]", "guardians[0]")]
    [InlineData("Guardians[0].Name", "guardians[0].name")]
    [InlineData("ReferenceContacts[12].Purposes", "referenceContacts[12].purposes")]
    public void CreateValidationProblem_KeysEachErrorByTheCamelCasePathOfTheRequestBody(string propertyPath, string wireKey)
    {
        IReadOnlyList<FieldError> fieldErrors = [new FieldError("Rule.Broken", "A regra foi violada.")];
        var error = Error.Validation(
            "Validation.Failed",
            "bad input",
            new Dictionary<string, IReadOnlyList<FieldError>> { [propertyPath] = fieldErrors });

        var problem = ApiProblemDetailsFactory.CreateValidationProblem(error);

        problem.Errors!.Keys.Should().Equal(wireKey);
        problem.Errors[wireKey].Should().BeSameAs(fieldErrors);
    }

    [Fact]
    public void CreateApplicationProblem_WithoutFieldErrors_KeepsTheEmptyKey()
    {
        var error = Error.NotFound("Tag.NotFound", "A etiqueta não foi encontrada.");

        var problem = ApiProblemDetailsFactory.CreateApplicationProblem(error);

        problem.Errors!.Keys.Should().Equal(string.Empty);
    }
}
