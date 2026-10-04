using FluentValidation;

namespace ServicesService.Application.Services.GetServiceById;

public sealed class GetServiceByIdQueryValidator : AbstractValidator<GetServiceByIdQuery>
{
    public GetServiceByIdQueryValidator()
    {
        RuleFor(query => query.ServiceId).MustBeAServiceId();
    }
}
